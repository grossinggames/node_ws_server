// ***************************************** Обработка неотловленных ошибок *******************************
// Отлавливаем необработанные исключения
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});


// ***************************************** Настройка framework express *******************************
var express = require('express');
var app     = express();
app.use( express.static('client') );


// ***************************************** Запуск http сервера *******************************
var http = require('http');
var server = http.createServer(app);
server.listen(process.env.PORT);


// ***************************************** Состояния групп *******************************
// Все созданные группы с количеством участников в каждой из них
var groups = [];

// Доступные группы созданные ранее
var availibleGroups = {};

// Максимальное количество пользователей в группе
var maxClientOnGroup = 12;


// ***************************************** Методы для работы с группами *******************************
// Метод получения id группы
function addClient(client) {
    //console.log('addClient');
    var id = getAvailableGroup(client);
    if (!id) {
        id = getNewIdGroup();
        addAvailableGroup(id, client);
    }
    return id;
}

// Метод получения группы из списка доступных групп
function getAvailableGroup(client) {
    // console.log('getAvailableGroup');
    // Отдавать свою же комнату в случае если нет других, а не создавать новую
    
    for (var key in availibleGroups) {
        if (key != client.group) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if (!availibleGroups[key].slots[i]) {
                    availibleGroups[key].slots[i] = client;
                    client.slot = i;
                    if (i == maxClientOnGroup - 1) {
                        groups[key] = availibleGroups[key];
                        delete availibleGroups[key];
                    }
                    return key;
                }
            }
        }
    }
    return false;
}

// Метод получения id группы
function getNewIdGroup() {
    return groups.length;
}

// Метод добавления новой группы в списоки групп
function addAvailableGroup(id, client) {
    //console.log('addAvailableGroup');
    groups.push({});
    availibleGroups[id] = { slots: {"0": client}, current: 0 };
    client.slot = 0;
}

// Выход клиента из группы
function outClient(client) {
    //console.log('outClient');
    var id   = client.group
    var slot = client.slot;
    if (availibleGroups[id]) {
        if (availibleGroups[id].slots && availibleGroups[id].slots[slot]) {
            availibleGroups[id].slots[slot] = null;
            return true;
        }
        console.log('Error on function outClient not found availibleGroups[id]');
    }

    if (groups[id]) {
        if (groups[id].slots && groups[id].slots[slot]) {
            groups[id].slots[slot] = null;
            availibleGroups[id] = groups[id];
            groups[id] = {}; // Возможно нужно присвоить другое значение например null
            return true;
        }
        console.log('Error on function outClient not found availibleGroups[id]');
    }

    return false;
}


// ***************************************** Методы отправки сообщений в группы *******************************
// Отправить сообщения всей группе
function sendMessageGroup(id, message) {
    if (availibleGroups[id] || groups[id]) {
        for (var i = 0; i < maxClientOnGroup; i++) {
            // Отсылаем в сообщении каждому пользователю его slot в группе
            message.slot = i;

            if (availibleGroups[id] && availibleGroups[id].slots && availibleGroups[id].slots[i]) {
                availibleGroups[id].slots[i].send( JSON.stringify(message) );
            }
            if (groups[id] && groups[id].slots && groups[id].slots[i]) {
                groups[id].slots[i].send( JSON.stringify(message) );
            }
        }
    }
}

// Отправить текущее состояние в группе по слотам всей группе
function sendStateGroup(client) {
    var message = { slots: {} };
    for (var i = 0; i < maxClientOnGroup; i++) {
        message.slots[i] = 0;

        if (availibleGroups[client.group] && availibleGroups[client.group].slots && availibleGroups[client.group].slots[i] && availibleGroups[client.group].slots[i].group >= 0) {
            message.slots[i] = {photo: availibleGroups[client.group].slots[i].photo};
        }
        if (groups[client.group] && groups[client.group].slots && groups[client.group].slots[i] && groups[client.group].slots[i].group >= 0) {
            message.slots[i] = {photo: groups[client.group].slots[i].photo};
        }
    }
    sendMessageGroup(client.group, message);
}


// ***************************************** Бутылочка *******************************
// Получить следующего кто крутит бутылочку
function getNextSlot(group) {

    // Получить новый слот
    function getSlot(group, arr) {
        for (var i = ++arr[group].current; i < maxClientOnGroup; i++) {
            if (arr[group].slots[i]) {
                return i;
            }
        }
        for (var i = 0, count = arr[group].current; i < count; i++) {
            if (arr[group].slots[i]) {
                return i;
            }
        }
        return false;
    }

    var slot = false;

    if (availibleGroups[group]) {
        if ("current" in availibleGroups[group]) {
            slot = getSlot(group, availibleGroups);
        }
    } else if (groups[group]) {
        if ("current" in groups[group]) {
            slot = getSlot(group, groups);
        }
    }
    return slot;
}

// Поиск партнера
function getPartner(group) {
    // формируем список доступных слотов
    var slots = [];

    if (availibleGroups[group]) {
        if ("slots" in availibleGroups[group]) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if (availibleGroups[group].slots[i] && availibleGroups[group].current != i) {
                    slots.push(i);
                }
            }
        }
    } else if (groups[group]) {
        if ("slots" in groups[group]) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if (groups[group].slots[i] && groups[group].current != i) {
                    slots.push(i);
                }
            }
        }
    }

    function randomInteger(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1);
        rand = Math.round(rand);
        return rand;
    }

    if (slots.lenght > 0) {
        return randomInteger(0, slots.lenght - 1);
    }

    return false;
}


// ***************************************** Запуск websocket сервера *******************************
var wsServer = require('ws').Server;
var socket      = new wsServer({server: server});

// Открыто новое соединение
socket.on('connection', function(client) {
    client.group = addClient(client);
    sendStateGroup(client);
    //traceState();

    // Сообщения от пользователя
    client.on('message', function(message) {
        message = JSON.parse(message);

        // Пользователь дал ссылку на свою аву
        if ("photo" in message) {
            client.photo = message.photo;
            sendStateGroup(client);
        }

        // Пользователь отправил сообщение
        if ("msg" in message) {        
            sendMessageGroup(client.group, {msg: message.msg});
        }

        // Пользователь хочет сменить стол
        if ("table" in message) {
            if (message.table == "change") {
                outClient(client);
                sendStateGroup(client);
                client.group = addClient(client);
                sendStateGroup(client);
            }
        }

        // Пользователь кликнул по бутылке.
        if ("bottle" in message) {
            if (message.bottle) {
                sendMessageGroup(client.group, { bottle: {partner: getPartner()} });

                /*
                var slot = getNextSlot(client.group);
                if (availibleGroups[client.group] && availibleGroups[client.group].current) {
                    availibleGroups[client.group].current = slot;
                    sendMessageGroup(client.group, {bottle: slot});
                    return;
                }
                if (groups[client.group] && groups[client.group].current) {
                    groups[client.group].current = slot;
                    sendMessageGroup(client.group, {bottle: slot});
                    return;
                }
                */
            }
        }
    });

    client.on('close', function() {
        outClient(client);
        sendStateGroup(client);
        //traceState();
    });
});


// ***************************************** Показать состояние в группах *******************************
// Логгирование состояний
function traceState() {
    for (var i = 0; i < groups.length; i++) {
        for (var j = 0; j < maxClientOnGroup; j++) {
            if (groups[i].slots && groups[i].slots[i]) {
                console.log('groups[' + i + '] = [' + groups[i].slots[j].id + ']');
            }
        }
    }

    for (var key in availibleGroups) {
        for (var i = 0; i < maxClientOnGroup; i++) {
            if (availibleGroups[key].slots && availibleGroups[key].slots[i]) {
                console.log('availibleGroups[' + key + '] = [' + availibleGroups[key].slots[i].id + ']');
            }
        }
    }
    console.log('*****************************************');
}
