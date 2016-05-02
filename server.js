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
// Получить index группы
function addClient(client) {
    //console.log('addClient');
    var id = getAvailableGroup(client);
    if (!id) {
        id = getNewIdGroup();
        addAvailableGroup(id, client);
    }
    return id;
}

// Получить свободную группу
function getAvailableGroup(client) {
    // console.log('getAvailableGroup');
    // Отдавать свою же комнату в случае если нет других, а не создавать новую
    
    for (var key in availibleGroups) {
        if (key != client.group) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if (!availibleGroups[key].slots[i]) {
                    availibleGroups[key].slots[i] = client;
                    client.slot = i;

                    // Если все слоты заняты переносим в список полных групп
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
    availibleGroups[id] = 
    { 
        slots: {"0": client}, 
        current: 0, 
        partners: [0, 0]
    };
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
    // Если это сообщение в чат пустое не отправляем его
    if ( ("msg" in message) && (message.msg == "") ) {
        return false;
    }

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

// Отправить текущее состояние группы каждому клиенту. (Состояние слотов, кто крутит бутылку)
function sendStateGroup(client) {
    var message = { slots: {} };
    for (var i = 0; i < maxClientOnGroup; i++) {
        message.slots[i] = 0;
        
        // Если клиент в не полной группе
        if (availibleGroups[client.group] && availibleGroups[client.group].slots && availibleGroups[client.group].slots[i] && availibleGroups[client.group].slots[i].group >= 0) {
            message.slots[i] = {photo: availibleGroups[client.group].slots[i].photo};
            //message.current = availibleGroups[client.group].current;
        }
        
        // Если клиент в полной группе
        if (groups[client.group] && groups[client.group].slots && groups[client.group].slots[i] && groups[client.group].slots[i].group >= 0) {
            message.slots[i] = {photo: groups[client.group].slots[i].photo};
            //message.current = groups[client.group].current;
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
                if ( (availibleGroups[group].slots[i]) && (availibleGroups[group].partners[0] != i) ) {
                    // console.log('partners[0] = ' + availibleGroups[group].partners[0] + ' i = ' + i);
                    slots.push(i);
                }
            }
        }
    } else if (groups[group]) {
        if ("slots" in groups[group]) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if ( (groups[group].slots[i]) && (groups[group].partners[0] != i) ) {
                    // console.log('partners[0] = ' + groups[group].partners[0] + ' i = ' + i);
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

    if (slots.length > 0) {
        return slots[ randomInteger(0, slots.length - 1) ];
    }

    return -1;
}


// ***************************************** Запуск websocket сервера *******************************
var wsServer = require('ws').Server;
var socket      = new wsServer({server: server});

// Открыто новое соединение
socket.on('connection', function(client) {
    client.group = addClient(client);
    sendStateGroup(client);
    traceState();

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
            traceState();
        }

        // Пользователь хочет сменить стол
        if ("table" in message) {
            if (message.table == "change") {
                outClient(client);
                sendStateGroup(client);
                client.group = addClient(client);
                sendStateGroup(client);
            }
            traceState();
        }

        // Пользователь кликнул по бутылке. Отсылаем в ответ партнера для поцелуя. Если парнера нет посылаем -1
        if ("bottle" in message) {
            if (message.bottle) {
                // Избавиться от partner1 partner2
                var partner1;
                var partner2;

                if (availibleGroups[client.group]) {
                    if ("partners" in availibleGroups[client.group]) {
                        availibleGroups[client.group].partners[0] = availibleGroups[client.group].current;
                        partner2 = getPartner(client.group);
                        availibleGroups[client.group].partners[1] = partner2;
                        partner1 = availibleGroups[client.group].partners[0];
                    }
                } else if (groups[client.group]) {
                    if ("partners" in groups[client.group]) {
                        groups[client.group].partners[0] = groups[client.group].current;
                        partner2 = getPartner(client.group);
                        groups[client.group].partners[1] = partner2;
                        partner1 = groups[client.group].partners[0];
                    }
                }

                // Отправка тех кто будет целоваться
                sendMessageGroup(client.group, { bottle: {partners: [partner1, partner2]} });

                // Сделать интервал и запускать только после окончания поцелуев прошлой пары
                // Отправка номера кто будет крутить
                var slot = getNextSlot(client.group);
                
                // Отправка всей группе того кто крутит бутылку
                if (availibleGroups[client.group] && availibleGroups[client.group].current) {
                    availibleGroups[client.group].current = slot;
                    //availibleGroups[client.group].partners[0] = slot;
                    sendMessageGroup(client.group, { bottle: {current: slot} });
                    traceState();
                    return;
                }
                if (groups[client.group] && groups[client.group].current) {
                    groups[client.group].current = slot;
                    //groups[client.group].partners[0] = slot;
                    sendMessageGroup(client.group, { bottle: {current: slot} });
                    traceState();
                    return;
                }
            }
        }
    });

    client.on('close', function() {
        outClient(client);
        sendStateGroup(client);
        traceState();
    });
});


// ***************************************** Показать состояние в группах *******************************
// Логгирование состояний
function traceState() {
    /*
    for (var i = 0; i < groups.length; i++) {
        for (var j = 0; j < maxClientOnGroup; j++) {
            if (groups[i].slots && groups[i].slots[i]) {
                console.log('groups[' + i + '] = [' + groups[i].slots[j] + ']');
            }
        }
    }

    for (var key in availibleGroups) {
        for (var i = 0; i < maxClientOnGroup; i++) {
            if (availibleGroups[key].slots && availibleGroups[key].slots[i]) {
                console.log('availibleGroups[' + key + '] = [' + availibleGroups[key].slots[i] + ']');
            }
        }
    }
    console.log('*****************************************');
    */
}
