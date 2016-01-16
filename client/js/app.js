window.onload = function() {
    // ********************************************** Работа с websocket **********************************************
    var socket     = new WebSocket("ws://" + window.location.hostname + ":" + window.location.port);
    var chat_field = document.getElementById('chat_field');
    var nick       = "Nick";

    socket.onopen  = function() {
      console.log("Соединение установлено.");
    };

    socket.onclose = function(event) {
      if (event.wasClean) {
        console.log('Соединение закрыто чисто');
      } else {
        console.log('Обрыв соединения');
      }
      console.log('Код: ' + event.code + ' причина: ' + event.reason);
    };

    socket.onmessage = function (event) {
        try {
            var result = JSON.parse(event.data);

            if ("slots" in result) {
                //positionsDefault[slot][0];
                //document.getElementById('player' + result.slot).style.background = 'url(../images/photo.png) no-repeat';
                for (key in result.slots) {
                    if (result.slots[key]) {
                        document.getElementById('player' + key).style.background = 'url(../images/photo.png) no-repeat';
                    } else {
                        document.getElementById('player' + key).style.background = 'url() no-repeat';
                    }
                }
            } else if ("msg" in result) {
                chat_field.innerHTML += '<li><strong>' + nick + ': </strong>' + result.msg + '</li>';
                chat_field.scrollTop =  chat_field.scrollHeight;
            }
        } catch(e) {
            console.log("Error Message: " + e.message);
            return;
        }
    };

    socket.onerror = function(error) {
      console.log("Ошибка " + error.message);
    };

    // ********************************************** Отпрака сообщений **********************************************
    var text_field = document.getElementById('text_field');

    // Отправить сообщение
    function sendMessage() {
        socket.send(text_field.value);
        text_field.value = "";
    }

    // Отпавить сообщение на Enter
    text_field.onkeydown = function (e) {
        if (e.keyCode == 13) {
            sendMessage();
        }
    };

    var send = document.getElementById('send');

    // Клик отпраки сообщения
    send.onclick = function () {
        sendMessage();
    };

    // Наведение
    send.onmouseover  = function () {
        send.style.backgroundPosition = "-52px 0";
    };

    // Снять наведение
    send.onmouseleave  = function () {
        send.style.backgroundPosition = "0 0";
    };


    // ********************************************** Смена бутылки **********************************************
    var change_bottle = document.getElementById('change_bottle');

    // Клик
    change_bottle.onclick = function () {

    };

    // Наведение
    change_bottle.onmouseover  = function () {
        change_bottle.style.backgroundPosition = "-35px 0";
    };

    // Снять наведение
    change_bottle.onmouseleave  = function () {
        change_bottle.style.backgroundPosition = "0 0";
    };


    // ********************************************** Смена стола **********************************************
    var change_table = document.getElementById('change_table');

    // Клик
    change_table.onclick = function () {

    };

    // Наведение
    change_table.onmouseover  = function () {
        change_table.style.backgroundPosition = "-35px 0";
    };

    // Снять наведение
    change_table.onmouseleave  = function () {
        change_table.style.backgroundPosition = "0 0";
    };


    // ********************************************** Открыть магазин **********************************************
    var buy = document.getElementById('buy');

    // Клик
    buy.onclick = function () {

    };

    // Наведение
    buy.onmouseover  = function () {
        buy.style.backgroundPosition = "-42px 0";
    };

    // Снять наведение
    buy.onmouseleave  = function () {
        buy.style.backgroundPosition = "0 0";
    };


    // ********************************************** Достижения **********************************************
    var achievements = document.getElementById('achievements');

    // Клик
    achievements.onclick = function () {

    };

    // Наведение
    achievements.onmouseover  = function () {
        achievements.style.backgroundPosition = "-35px 0";
    };

    // Снять наведение
    achievements.onmouseleave  = function () {
        achievements.style.backgroundPosition = "0 0";
    };


    // ********************************************** Рейтинг **********************************************
    var rating = document.getElementById('rating');

    // Клик
    rating.onclick = function () {

    };

    // Наведение
    rating.onmouseover  = function () {
        rating.style.backgroundPosition = "-34px 0";
    };

    // Снять наведение
    rating.onmouseleave  = function () {
        rating.style.backgroundPosition = "0 0";
    };


    // ********************************************** Звук **********************************************
    var sound = document.getElementById('sound');

    // Поменять состояние звука
    sound.onclick = function () {
        // если отключен 0
        // если подключен -105
        sound.style.backgroundPosition = "-70px 0";

    };

    // Наведение
    sound.onmouseover  = function () {
        // если отключен -70
        // если подключен -105
        sound.style.backgroundPosition = "-105px 0";
    };

    // Снять наведение
    sound.onmouseleave  = function () {
        // если отключен 0
        // если подключен -35
        sound.style.backgroundPosition = "-35px 0";
    };


    // ********************************************** Позиции **********************************************
    var positionsDefault = [
        [33,  377],
        [53,  492],
        [208, 577],
        [362, 577],
        [448, 477],
        [469, 358],
        [469, 243],
        [448, 128],
        [293,  43],
        [139,  43],
        [54,  147],
        [32,  262]
    ];
}