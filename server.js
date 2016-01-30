// ***************************************** Обработка неотловленных ошибок *******************************
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
var maxClientOnGroup = 3;


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

// Выход клиента
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


// ***************************************** Методы смены группы *******************************
//outClient(client.group);
//client.group = addClient();


// ***************************************** Методы отправки сообщений в группы *******************************
function sendMessageGroup(id, message) {

    // Удалить после тестов
    var slot = null;
    if ("msg" in message) {
        slot = getNextSlot(id);
    }

    if (availibleGroups[id] || groups[id]) {
        if (availibleGroups[id] && availibleGroups[id].current) {
            availibleGroups[id].current = slot;
        }
        if (groups[id] && groups[id].current) {
            groups[id].current = slot;
        }

        for (var i = 0; i < maxClientOnGroup; i++) {
            // Отсылаем каждому его slot в группе
            message.slot = i;
            
            // Удалить после тестов
            if ("msg" in message) {
                message.msg = slot;
            }

            if (availibleGroups[id] && availibleGroups[id].slots && availibleGroups[id].slots[i]) {
                availibleGroups[id].slots[i].send( JSON.stringify(message) );
            }
            if (groups[id] && groups[id].slots && groups[id].slots[i]) {
                groups[id].slots[i].send( JSON.stringify(message) );
            }
        }
    }
}

function updateStateGroup(client) {
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

function sendIdSlot() {

}

function updateStateBottle() {
    //var message = { bottle: {} };
    //sendMessageGroup(client.group, message);
}


// ***************************************** Бутылочка *******************************
// Все созданные группы с количеством участников в каждой из них
/*groups = [
    {
        slots: {
            "0": "ws",
            "1": "ws"
        },
        current: 0,
        kissing: [0,11]
    }
];

availibleGroups = {
    "0": {
        slots: {
            "0": "ws",
            "1": "ws"
        },
        current: 0,
        kissing: [0,1]
    }
};

*/

// Получить следующего кто крутит бутылочку
function getNextSlot(group) {

    function getSlot(group, arr) {
        for (var i = ++arr[group].current; i < maxClientOnGroup; i++) {
            if (arr[group].slots[i]) {
                console.log('getSlot (1) return i = ', i);
                return i;
            }
        }
        for (var i = 0, count = arr[group].current; i < count; i++) {
            if (arr[group].slots[i]) {
                console.log('getSlot (2) return i = ', i);
                return i;
            }
        }

        console.log('getSlot return false');
        return false;
    }

    var slot = false;

    if (groups[group]) {
        if ("current" in groups[group]) {
            console.log('groups[group].current = ', groups[group].current);
            slot = getSlot(group, groups);
        }
    } else if (availibleGroups[group]) {
        if ("current" in availibleGroups[group]) {
            console.log('availibleGroups[group].current = ', availibleGroups[group].current);
            slot = getSlot(group, availibleGroups);
        }
    }

    console.log('getNextSlot return slot = ', slot);
    return slot;
}


// ***************************************** Запуск websocket сервера *******************************
var wsServer = require('ws').Server;
var socket      = new wsServer({server: server});
socket.on('connection', function(client) {
    client.group = addClient(client);
    //sendIdSlot(client);
    updateStateGroup(client);
    //traceState();

    client.on('message', function(message) {
        message = JSON.parse(message);
        if ("photo" in message) {
            client.photo = message.photo;
            updateStateGroup(client);
        }
        if ("msg" in message) {        
            sendMessageGroup(client.group, {msg: message.msg});
        }
        if ("table" in message) {
            if (message.table == "change") {
                outClient(client);
                updateStateGroup(client);
                client.group = addClient(client);
                //sendIdSlot(client);
                updateStateGroup(client);
            }
        }
    });

    client.on('close', function() {
        outClient(client);
        updateStateGroup(client);
        //traceState();
    });
});


// ***************************************** Показать состояние в группах *******************************
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
