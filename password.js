document.addEventListener("DOMContentLoaded", () => {
  // MUDE A SENHA AQUI
  const SITE_PASSWORD = "MegaHunt2026";

  const passwordScreen = document.getElementById("passwordScreen");
  const mainApp = document.getElementById("mainApp");
  const passwordInput = document.getElementById("passwordInput");
  const passwordButton = document.getElementById("passwordButton");
  const passwordError = document.getElementById("passwordError");

  if (
    !passwordScreen ||
    !mainApp ||
    !passwordInput ||
    !passwordButton ||
    !passwordError
  ) {
    console.error("Erro: elementos da tela de senha não foram encontrados.");
    return;
  }

  function unlockSite() {
    sessionStorage.setItem("megaHuntAccess", "allowed");

    passwordScreen.style.display = "none";
    mainApp.style.display = "grid";

    passwordInput.value = "";
    passwordError.style.display = "none";
  }

  function checkPassword() {
    const typedPassword = passwordInput.value.trim();

    if (typedPassword === SITE_PASSWORD) {
      unlockSite();
      return;
    }

    passwordError.textContent = "Senha incorreta.";
    passwordError.style.display = "block";

    passwordInput.value = "";
    passwordInput.focus();
  }

  const accessAllowed =
    sessionStorage.getItem("megaHuntAccess") === "allowed";

  if (accessAllowed) {
    unlockSite();
  } else {
    passwordScreen.style.display = "flex";
    mainApp.style.display = "none";
    passwordInput.focus();
  }

  passwordButton.addEventListener("click", checkPassword);

  passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      checkPassword();
    }
  });
});
