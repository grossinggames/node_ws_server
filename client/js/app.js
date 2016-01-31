// Инициализация вк
VK.init(function() {
    // API initialization succeeded
    console.log('Успеная регстрация вконтакте');

    // ********************************************** Работа с websocket **********************************************
    // Добавить обработчик на socket.disconnect

    var socket     = new WebSocket("wss://" + window.location.hostname + ":" + window.location.port);
    var chat_field = document.getElementById('chat_field');
    var nick       = "Nick";
    var current;
    var partner;

    // Соединение открыто
    socket.onopen  = function() {
        console.log("Websocket соединение установлено.");

        VK.api("users.get", {fields: "photo_100"}, function(data) { 
            if (data && data.response && data.response[0] && data.response[0].photo_100) {
                socket.send( JSON.stringify({photo: data.response[0].photo_100}) );
            }
        });

    };

    // Соединение закрыто
    socket.onclose = function(event) {
      if (event.wasClean) {
        console.log('Соединение закрыто чисто');
      } else {
        console.log('Обрыв соединения');
      }
      console.log('Код: ' + event.code + ' причина: ' + event.reason);
    };

    // Пришло сообщение
    socket.onmessage = function (event) {
        try {
            var result = JSON.parse(event.data);

            // Обновления в слотах
            if ("slots" in result) {
                for (key in result.slots) {
                    if (result.slots[key].photo) {
                        document.getElementById('player' + key).style.background = 'url(' + result.slots[key].photo + ') no-repeat';
                    } else {
                        document.getElementById('player' + key).style.background = 'url() no-repeat';
                    }
                }
            }

            // Новое сообщние
            if ("msg" in result) {
                chat_field.innerHTML += '<li><strong>' + nick + ': </strong>' + result.msg + '</li>';
                chat_field.scrollTop =  chat_field.scrollHeight;
            }

            // Бутылка
            if ("bottle" in result) {
                // Устанавливаем значение слота который крутит бутылку
                if ("current" in result.bottle) {
                    current = result.bottle.current;
                    chat_field.innerHTML += '<li><strong>' + nick + ': </strong>Current ' + current + '</li>';
                    chat_field.scrollTop =  chat_field.scrollHeight;
                }

                // Устанавливаем партнера для поцелуя
                if ("partner" in result.bottle) {
                    partner = result.bottle.partner;
                    if (partner >= 0 && partner < 12) {
                        bottle.style.transform = 'rotate(' + settings[partner].angle + 'deg)';
                    } else {
                        // Прекращаем крутить бутылку.
                        bottle.style.transform = 'rotate(0deg)';
                    }
                    chat_field.innerHTML += '<li><strong>' + nick + ': </strong>Partner ' + partner + '</li>';
                    chat_field.scrollTop =  chat_field.scrollHeight;
                }
            }
        } catch(e) {
            console.log("Error Message: " + e.message);
            return;
        }
    };

    // Ошибка с соединением
    socket.onerror = function(error) {
      console.log("Ошибка " + error.message);
    };


    // ********************************************** Отпрака сообщений **********************************************
    var text_field = document.getElementById('text_field');

    // Отправить сообщение
    function sendMessage() {
        socket.send( JSON.stringify({msg: text_field.value}) );
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
    /*
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
    */

    // ********************************************** Смена стола **********************************************
    var change_table = document.getElementById('change_table');

    // Клик
    change_table.onclick = function () {
        chat_field.innerHTML = "";
        socket.send( JSON.stringify({table: "change"}) );
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
    /*
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
    */

    // ********************************************** Достижения **********************************************
    /*
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
    */

    // ********************************************** Рейтинг **********************************************
    /*
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
    */

    // ********************************************** Звук **********************************************
    // Кнопка
    var sound = document.getElementById('sound');
    var soundOn = true;

    // Поменять состояние звука
    sound.onclick = function () {
        soundOn = !soundOn;
        if (soundOn) {
            sound.style.backgroundPosition = "-105px 0";
        } else {
            sound.style.backgroundPosition = "-70px 0";
        }
    };

    // Наведение
    sound.onmouseover  = function () {
        if (soundOn) {
            sound.style.backgroundPosition = "-105px 0";
        } else {
            sound.style.backgroundPosition = "-70px 0";
        }
    };

    // Снять наведение
    sound.onmouseleave  = function () {
        if (soundOn) {
            sound.style.backgroundPosition = "-35px 0";
        } else {
            sound.style.backgroundPosition = "0 0";
        }
    };

    //Функция воспроизведения звука
    function playSound() {
        if (soundOn) {
            // Функция воспроизведения звука
        }
    }


    // ********************************************** Бутылка **********************************************
    // Бутылка
    var bottle = document.getElementById('bottle');

    // Поменять состояние звука
    bottle.onclick = function () {
        socket.send( JSON.stringify({bottle: '1'}) );
    };

    // Наведение
    bottle.onmouseover  = function () {

    };

    // Снять наведение
    bottle.onmouseleave  = function () {

    };


    // ********************************************** Позиции **********************************************
    // Настройки слотов
    var settings = [
        { defPos: [33,  77],  angle: 18 },  // 0
        { defPos: [53,  492], angle: 41 },  // 1
        { defPos: [208, 577], angle: 77 },  // 2
        { defPos: [362, 577], angle: 110 }, // 3
        { defPos: [448, 477], angle: 135 }, // 4
        { defPos: [469, 358], angle: 165 }, // 5
        { defPos: [469, 243], angle: 200 }, // 6
        { defPos: [448, 128], angle: 224 }, // 7
        { defPos: [293, 43],  angle: 262 }, // 8
        { defPos: [139, 43],  angle: 297 }, // 9
        { defPos: [54,  147], angle: 322 }, // 10
        { defPos: [32,  262], angle: 350 }  // 11
    ]


}, function() {
    // API initialization failed
    console.log('Ошибка инициализации');
}, '5.42');
