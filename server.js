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
server.listen(8000);


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
    //console.log('getAvailableGroup');
    for (key in availibleGroups) {
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
    message = JSON.stringify(message);
    
    if (availibleGroups[id] || groups[id]) {
        for (var i = 0; i < maxClientOnGroup; i++) {
            if (availibleGroups[id] && availibleGroups[id].slots && availibleGroups[id].slots[i]) {
                availibleGroups[id].slots[i].send(message);
            }
            if (groups[id] && groups[id].slots && groups[id].slots[i]) {
                groups[id].slots[i].send(message);
            }
        }
    }
}

function updateStateGroup(client) {
    var message = { slots: {} };
    for (var i = 0; i < maxClientOnGroup; i++) {
        message.slots[i] = 0;

        if ( (availibleGroups[client.group] && availibleGroups[client.group].slots && availibleGroups[client.group].slots[i] && availibleGroups[client.group].slots[i].group >= 0) ||
            (groups[client.group] && groups[client.group].slots && groups[client.group].slots[i] && groups[client.group].slots[i].group >= 0) ) {
            message.slots[i] = 1;
        }
    }
    sendMessageGroup(client.group, message);
}


// ***************************************** Запуск websocket сервера *******************************
var wsServer = require('ws').Server;
var socket      = new wsServer({server: server});
socket.on('connection', function(client) {
    client.group = addClient(client);
    updateStateGroup(client);
    //traceState();

    client.on('message', function(message) {
        sendMessageGroup(client.group, {msg: message});
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

    for (key in availibleGroups) {
        for (var i = 0; i < maxClientOnGroup; i++) {
            if (availibleGroups[key].slots && availibleGroups[key].slots[i]) {
                console.log('availibleGroups[' + key + '] = [' + availibleGroups[key].slots[i].id + ']');
            }
        }
    }
    console.log('*****************************************');
}