const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", function () {

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    if (username === "" || password === "") {
        message.textContent = "Please enter username and password.";
        return;
    }

    message.textContent = "Login button is working!";
});