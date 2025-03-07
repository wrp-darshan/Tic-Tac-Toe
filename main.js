$("#loading").hide();
$("#bigCont").hide();
$("#userCont").hide();
$("#opponentCont").hide();
$("#valueCont").hide();
$("#whoesTurn").hide();

const socket = io();
let playerName, gameId, playerValue, playerId, currentTurn, gameOver = false;

$("#find").on("click", function () {
  playerName = $("#name").val().trim();

  $("#error-message").fadeOut();

  if (playerName.length < 3) {
    showError("Please enter a name with at least 3 characters.");
    return;
  }

  if (!/^[A-Za-z]+$/.test(playerName)) {
    showError("Please enter a valid name with only letters.");
    return;
  }

  $("#user").text(playerName);
  socket.emit("find", { name: playerName });
  $("#loading").show();
  $("#find").prop("disabled", true);
});

$("#name").on("keypress", function(event) {
  if (event.which >= 48 && event.which <= 57) { 
    event.preventDefault(); 
    showError("Numbers are not allowed. Please enter only letters.");
  }
});

function showError(message) {
  if ($("#error-message").length === 0) {
    $("body").append('<div id="error-message" style="display:none; color: red; font-weight: bold; position: absolute; top: 20px; left: 50%; transform: translateX(-50%);"></div>');
  }
  $("#error-message").text(message).fadeIn().delay(2000).fadeOut();
}

  socket.on("find", ({ gameSession }) => {
    console.log("Game Data:", gameSession);

    $("#loading").hide();
    $("#name").hide();
    $("#find").hide();
    $("#enterName").hide();
    $("#bigCont").css("display", "flex");
    $("#userCont").show();
    $("#opponentCont").show();
    $("#valueCont").show();
    $("#whoesTurn").show();
    $("#exitGame").hide();
    $("#chatbutton").show();

    gameId = gameSession.gameId;
    currentTurn = gameSession.turn;
    gameOver = false;

    if (gameSession.p1.name === playerName) {
      playerValue = "X";
      playerId = gameSession.p1.id;
      $("#oppName").text(gameSession.p2.name);
    } else {
      playerValue = "O";
      playerId = gameSession.p2.id;
      $("#oppName").text(gameSession.p1.name);
    }

    $("#value").text(playerValue);
    $("#whoesTurn").text(currentTurn + "'s Turn");
});


  $(".btn").each(function(index) {
    $(this).on("click", function() {
      if ($(this).text() !== "" || gameOver) return;
      if (currentTurn !== playerValue) return;
  
      socket.emit("playing", { gameId, index, playerId });
    });
  });
  

  socket.on("updateGame", (game) => {
    console.log("Game Updated:", game);
    currentTurn = game.turn;

    const exitBtn = $("#exitGame");
    const restartBtn = $("#restartGame");

    if (game.winner) {
      gameOver = true;
      $("#whoesTurn").text(`${game.winner} Wins! 🎉`);
      alert(`${game.winner} Wins! ��`);
      exitBtn.show();
      restartBtn.hide();
    } else if (!game.board.includes("") && !game.winner) {
      gameOver = true;
      $("#whoesTurn").text("It's a Draw! 🤝");
      alert("It's a Draw");
      restartBtn.show();
      exitBtn.hide();
    } else {
      $("#whoesTurn").text(game.turn + "'s Turn");
      exitBtn.hide();
      restartBtn.hide();
    }

    game.board.forEach((val, i) => {
      if (val) {
        $(".btn").eq(i).text(val);
      }
    });
});



  $("#restartGame").on("click", function () {
    socket.emit("restartGame", { gameId });

    $(".btn").each(function() {
      $(this).text("");
    });

    $("#whoesTurn").text("X's Turn");
    $("#restartGame, #exitGame").hide();

    gameOver = false;
});

  $("#exitGame").on("click", function () {
    socket.emit("exitGame", { gameId, playerId });

    $("#bigCont, #userCont, #opponentCont, #valueCont, #whoesTurn, #exitGame, #restartGame, #loading").hide();

    $("#name").show();
    $("#find").show();
    $("#enterName").show();
    $("#find").prop("disabled", false);

    $("#name").val("");

    $(".btn").each(function() {
      $(this).text("");
    });

    gameOver = false;
    currentTurn = "X";
    $("#whoesTurn").text("X's Turn");
});


  $(document).ready(function () {
    $(".chat-button").on("click", function () {
      $(".chat-box").show();
      $(".chat-button").hide();
    });

    $(".close-chat").on("click", function () {
      $(".chat-box").hide();
      $(".chat-button").show();
    });
    function appendMessage(name, message, isSelf = false) {
      const msgClass = isSelf ? "self-message" : "other-message";
      $("#messages").append(`<p class="${msgClass}"><strong>${name}:</strong> ${message}</p>`);
      $(".chat-box-body").scrollTop($("#messages")[0].scrollHeight);
    }
  
    $("#sendMessage").on("click", function () {
      const message = $("#messageInput").val().trim();
      if (!message) return;
    
      const playerName = $("#user").text() || "You";
      socket.emit("sendMessage", { name: playerName, message });
    
      $("#messageInput").val("");
    });
    
    socket.on("receiveMessage", function ({ name, message }) {
      const isSelf = name === ($("#user").text() || "You");
      appendMessage(name, message, isSelf);
    });
    
  });