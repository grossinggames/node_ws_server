// ******************** Обработка неотловленных ошибок********************
// Отлавливаем необработанные исключения
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});


// ******************** Настройка framework express ********************
var express = require('express');
var app     = express();
app.use( express.static('client') );


// ******************** Запуск http сервера ********************
var http = require('http');
var server = http.createServer(app);
server.listen(process.env.PORT);


// ******************** Состояния групп ********************
// Все созданные группы с количеством участников в каждой из них
var groups = [];

// Доступные группы созданные ранее
var availibleGroups = {};

// Максимальное количество пользователей в группе
var maxClientOnGroup = 12;


// ******************** Методы для работы с группами ********************
// Метод добавления клиента в группу и возрат id группы
function addClient(client) {
    var id = getAvailableGroup(client);
    if (!id) {
        id = getNewIdGroup();
        addAvailableGroup(id, client);
    }
    return id;
}

// Метод получения группы из списка доступных групп
function getAvailableGroup(client) {
    // Отдавать свою же комнату в случае если нет других, а не создавать новую
    for (var key in availibleGroups) {
        if (key != client.group) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if (!availibleGroups[key].slots[i]) {
                    
                    // Добавляем клиента в группу доступных
                    // (Вынести отдельно)
                    availibleGroups[key].slots[i] = client;
                    client.slot = i;
                    
                    // Если все слоты заняты, переносим группу в список доступных
                    // (Вынести отдельно)
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

// Метод получения новой id группы
function getNewIdGroup() {
    return groups.length;
}

// Метод добавления новой группы в списоки групп
function addAvailableGroup(id, client) {
    groups.push({});
    availibleGroups[id] = 
    { 
        slots:    {"0": client}, 
        current:  0, 
        partners: [0, 0],
        timer:    {}
    };
    client.slot = 0;
}

// Выход клиента из группы
function outClient(client) {
    var id   = client.group;
    var slot = client.slot;
    if (availibleGroups[id]) {
        if (availibleGroups[id].slots && availibleGroups[id].slots[slot]) {
            availibleGroups[id].slots[slot] = null;
            return true;
        }
        console.log('Error in function outClient not client in availibleGroups[id]');
    }

    if (groups[id]) {
        if (groups[id].slots && groups[id].slots[slot]) {
            groups[id].slots[slot] = null;
            availibleGroups[id] = groups[id];
            groups[id] = {}; // Возможно нужно присвоить другое значение например null
            return true;
        }
        console.log('Error in function outClient not client in groups[id]');
    }

    return false;
}


// ******************** Методы отправки сообщений в группы ********************
// Отправить сообщение клиенту
function sendMessageClient(client, message) {
    try {
        client.send( JSON.stringify(message) );
    } catch (err) {
        outClient(client);
        sendStateGroup(client);
        console.log('Error in function sendMessageClient err = ', err);
    }
}

// Отправить сообщения всей группе
function sendMessageGroup(id, message) {
    // Если это сообщение в чат пустое не отправляем его
    if ( ("msg" in message) && (message.msg == "") ) {
        return false;
    }

    if (availibleGroups[id] || groups[id]) {
        for (var i = 0; i < maxClientOnGroup; i++) {
            // Дополнительно отсылаем в сообщении каждому пользователю его slot в группе
            message.slot = i;

            if (availibleGroups[id].slots && availibleGroups[id].slots[i]) {
                sendMessageClient(availibleGroups[id].slots[i], message);
            }
            if (groups[id] && groups[id].slots && groups[id].slots[i]) {
                sendMessageClient(groups[id].slots[i], message);
            }

        }
    }
}

// Отправить текущее состояние группы каждому клиенту. (Состояние слотов, кто крутит бутылку)
function sendStateGroup(client) {
    var message = { slots: {}, room: client.group };
    
    for (var i = 0; i < maxClientOnGroup; i++) {
        message.slots[i] = 0;
        
        // Если клиент в не полной группе
        if (availibleGroups[client.group] && 
            availibleGroups[client.group].slots && 
            availibleGroups[client.group].slots[i] && 
            availibleGroups[client.group].slots[i].group >= 0) {
            message.slots[i] = {photo: availibleGroups[client.group].slots[i].photo};
            //message.current = availibleGroups[client.group].current;
        }
        
        // Если клиент в полной группе
        if (groups[client.group] && groups[client.group].slots && 
            groups[client.group].slots[i] && 
            groups[client.group].slots[i].group >= 0) {
            message.slots[i] = {photo: groups[client.group].slots[i].photo};
            //message.current = groups[client.group].current;
        }
    }
    sendMessageGroup(client.group, message);
}


// ******************** Бутылочка ********************
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
                if ( (availibleGroups[group].slots[i]) && 
                     (availibleGroups[group].partners[0] != i) ) {
                    // console.log('partners[0] = ' + availibleGroups[group].partners[0] + ' i = ' + i);
                    slots.push(i);
                }
            }
        }
    } else if (groups[group]) {
        if ("slots" in groups[group]) {
            for (var i = 0; i < maxClientOnGroup; i++) {
                if ( (groups[group].slots[i]) && 
                     (groups[group].partners[0] != i) ) {
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

// Переход хода бутылки
function changeCurrent(idGroup) {
    var slot = getNextSlot(idGroup);
    
    // Отправка всей группе того кто крутит бутылку
    if (availibleGroups[idGroup]) {
        if ("slots" in availibleGroups[idGroup]) {
            availibleGroups[idGroup].current = slot;
            sendMessageGroup(idGroup, { bottle: {current: slot} });
            traceState();
            //return;
        }
    }
    if (groups[idGroup]) {
        if ("slots" in groups[idGroup]) {
            groups[idGroup].current = slot;
            console.log('groups[idGroup] = ', groups[idGroup]);
            sendMessageGroup(idGroup, { bottle: {current: slot} });
            traceState();
            //return;
        }
    }
    availibleGroups[idGroup].timer = setTimeout( 
        function() {
            clickBottle(idGroup);
        }, 5000
    );
}

// Имитация клика по бутылке
function clickBottle(idGroup) {
    clearTimeout(availibleGroups[idGroup].timer);

    // Избавиться от partner1 partner2 когда удалится availibleGroups
    var partner1;
    var partner2;

    if (availibleGroups[idGroup]) {
        if ("partners" in availibleGroups[idGroup]) {
            availibleGroups[idGroup].partners[0] = availibleGroups[idGroup].current;
            partner2 = getPartner(idGroup);
            availibleGroups[idGroup].partners[1] = partner2;
            partner1 = availibleGroups[idGroup].partners[0];
        }
    } else if (groups[idGroup]) {
        if ("partners" in groups[idGroup]) {
            groups[idGroup].partners[0] = groups[idGroup].current;
            partner2 = getPartner(idGroup);
            groups[idGroup].partners[1] = partner2;
            partner1 = groups[idGroup].partners[0];
        }
    }
    
    // Отправка тех кто будет целоваться
    sendMessageGroup(idGroup, { bottle: {partners: [partner1, partner2]} });

    availibleGroups[idGroup].timer = setTimeout(function() {
        startKissing(idGroup, partner1, partner2);
    }, 5000);
}

// Анимация приближения партнеров
function startKissing(idGroup, partner1, partner2) {
    if (availibleGroups[idGroup].slots[partner1] && availibleGroups[idGroup].slots[partner2]) {
        // Запуск анимации поцелуя
        // Отправка тех кто будет целоваться
        sendMessageGroup(idGroup, { bottle: {start_kissing: [partner1, partner2]} });
        
        // Передача хода по таймауту
        availibleGroups[idGroup].timer = setTimeout(function() {
            changeCurrent(idGroup);
        }, 5000);
    } else {
        changeCurrent(idGroup);
    }
}


// ******************** Запуск websocket сервера ********************
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

        // Объединить всю информацию о клиенте в единый объект ссылка на аву, имя, id, фамилия и тд
        // Пользователь дал ссылку на свою аву
        if ("photo" in message) {
            client.photo = message.photo;
            sendStateGroup(client);
        }
        // Пользователь свое имя
        if ("first_name" in message) {
            client.first_name = message.first_name;
        }

        // Пользователь отправил сообщение
        if ("msg" in message) {        
            if (client.first_name) {
                sendMessageGroup(client.group, {msg: message.msg, first_name: client.first_name});
                traceState();
            }
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
                clickBottle(client.group);
            }
        }
    });

    client.on('close', function() {
        outClient(client);
        sendStateGroup(client);
        traceState();
    });
});


// ******************** Показать состояние в группах ********************
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