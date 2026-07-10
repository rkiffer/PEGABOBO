// =========================
// ALTERE A SENHA AQUI
// =========================
const SITE_PASSWORD = "matatroxa19";

// =========================
// ELEMENTOS
// =========================
const passwordScreen = document.getElementById("passwordScreen");
const mainApp = document.getElementById("mainApp");
const passwordInput = document.getElementById("passwordInput");
const passwordButton = document.getElementById("passwordButton");
const passwordError = document.getElementById("passwordError");

// =========================
// LIBERA O ACESSO
// =========================
function unlockSite() {
    sessionStorage.setItem("megaHuntAccess", "true");

    passwordScreen.classList.add("hidden");
    mainApp.classList.remove("locked");
}

// =========================
// VERIFICA A SENHA
// =========================
function checkPassword() {

    if (passwordInput.value === SITE_PASSWORD) {

        passwordError.classList.remove("show");

        unlockSite();

    } else {

        passwordError.classList.add("show");

        passwordInput.value = "";

        passwordInput.focus();

    }

}

// =========================
// SE JÁ ESTIVER LOGADO
// =========================
if (sessionStorage.getItem("megaHuntAccess") === "true") {

    unlockSite();

} else {

    passwordInput.focus();

}

// =========================
// BOTÃO ENTRAR
// =========================
passwordButton.addEventListener("click", checkPassword);

// =========================
// ENTER
// =========================
passwordInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        checkPassword();

    }

});
