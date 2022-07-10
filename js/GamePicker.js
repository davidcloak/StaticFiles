function callGetRandomGame(thing) {
    fetch('http://www.davecloak.com/api/?test=' + thing)
        .then(res => res.text())
        .then(data => {
            var temp = data.split(",")
            document.getElementById('Players').value = temp[0];
            if (temp[2] != '' && temp[2].toLowerCase() != 'none') {
                document.getElementById('gamePicked').innerHTML = '<a href="' + temp[2] + '">' + temp[1] + '</a>';
            } else {
                document.getElementById('gamePicked').innerHTML = temp[1];
            }
        })
}

function populateCheckBox(gamesList) {
    var GameBox = document.getElementById("games");
    var GameBoxTop = document.getElementById("gamesChecked");
    GameBox.innerHTML = '';
    GameBoxTop.innerHTML = '';
    gamesList;

    for (var i = 0; i < gamesList.length - 1; i++) {
        var input = document.createElement("input");
        var labal = document.createElement("label");
        var gameL = gamesList[i].split(",");

        input.setAttribute("type", "checkbox");
        input.setAttribute("id", "games[]");
        input.setAttribute("value", gameL[0]);
        input.addEventListener('change', function () {
            if (this.checked) {
                var temp = 'changeT&game=' + this.value;
                fetch('http://www.davecloak.com/api/?test=' + temp)
                    .then(res => res.text())
                    .then(data => { })
            } else {
                var temp = 'changeF&game=' + this.value;
                fetch('http://www.davecloak.com/api/?test=' + temp)
                    .then(res => res.text())
                    .then(data => { })
            }
        })

        if (gameL[1] == " '1'") {
            input.checked = true;
            labal.innerHTML = gameL[0]

            var GameDivHolder = document.createElement("div");
            GameDivHolder.style.width = "max-content";

            GameDivHolder.append(input);
            GameDivHolder.append(labal);
            GameBoxTop.append(GameDivHolder);
            GameBoxTop.append(document.createElement("br"));
        }else{
            labal.innerHTML = gameL[0]

            var GameDivHolder = document.createElement("div");
            GameDivHolder.style.width = "max-content";

            GameDivHolder.append(input);
            GameDivHolder.append(labal);
            GameBox.append(GameDivHolder);
            GameBox.append(document.createElement("br"));
        }
    }
}

function callGetGame(thing) {
    fetch('http://www.davecloak.com/api/?test=' + thing)
        .then(res => res.text())
        .then(data => {
            document.getElementById('testing').innerHTML = data;
            temp = document.getElementById('testing').innerHTML;
            document.getElementById('testing').innerHTML = '';
            temp = temp.split(";");

            //document.getElementById('testing').innerHTML = temp;
            populateCheckBox(temp);
        })
}

function call(thing) {
    fetch('http://www.davecloak.com/api/?test=' + thing)
        .then(res => res.text())
        .then(data => {
            var messages = data.split('!$%,');
            document.getElementsByTagName("textarea")[0].innerHTML = '';
            for (var i = 0; i < messages.length - 1; i++) {
                var hmmm = messages[i];
                var individ = hmmm.split('$^,');
                document.getElementsByTagName("textarea")[0].innerHTML += individ[0] + ": " + individ[1] + '&#013;&#010;';
            }
            document.getElementsByTagName("textarea")[0].scrollTop = document.getElementsByTagName("textarea")[0].scrollHeight;
        })
}


function Send(name, message) {
    name = document.getElementById('name').value;
    message = document.getElementsByTagName("textarea")[1].value;
    if (name != '' && message != '') {
        value = 'send&message=' + message + '&name=' + name;
        message = document.getElementsByTagName("textarea")[1].value = '';
        call(value);
    } else if (name == '') {
        alert('You need a name. Top Right.')
    }
}

function GamePickerStartLoop() {
    call('grab')
    callGetRandomGame('GetGameR')
    callGetGame('GetGames')
    setTimeout(GamePickerStartLoop, 3250);
}

function AddGameBtn() {
    document.getElementById('addBtn').hidden = true;
    document.getElementById('FormNotForm').hidden = false;
}


function AddGame() {
    var name = document.getElementById("gameName").value;
    var min = document.getElementById("minPlayers").value;
    var max = document.getElementById("maxPlayers").value;
    var link = document.getElementById("link").value;

    var send = "addGame&name=" + name + "&min=" + min + "&max=" + max + "&link=" + link;

    if (name == '') {
        alert("You forgot the Games Name");
    } else if (min <= 0) {
        alert("You need a number greater the 0 for Min Player.");
    } else if (max <= 0) {
        alert("You need a number greater the 0 for Max Player.");
    }
    else {
        fetch('http://www.davecloak.com/api/?test=' + send)
            .then(res => res.text())
            .then(data => {
                //alert(send);
            })
        document.getElementById("gameName").value = '';
        min = document.getElementById("minPlayers").value = '';
        max = document.getElementById("maxPlayers").value = '';
        link = document.getElementById("link").value = '';
        document.getElementById('addBtn').hidden = false;
        document.getElementById('FormNotForm').hidden = true;
    }
}