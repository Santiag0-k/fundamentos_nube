document.addEventListener("DOMContentLoaded", function () {
  var API_BASE = window.CEA_API_BASE || "http://localhost:8081";
  var form = document.getElementById("loginForm");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    var usuario = form.elements["username"].value;
    var contrasena = form.elements["password"].value;

    try {
      var response = await fetch(API_BASE + "/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: usuario,
          password: contrasena
        })
      });

      if (!response.ok) {
        throw new Error("Credenciales invalidas");
      }
      var result = await response.json();
      localStorage.setItem("cea_admin_user", JSON.stringify({
        username: (result && result.username) || usuario,
        role: (result && result.role) || "admin"
      }));
      localStorage.setItem("cea_auth", JSON.stringify({
        ok: true,
        at: Date.now()
      }));

      window.location.href = "admin.html";
    } catch (error) {
      alert("Usuario o contrasena incorrectos");
    }
  });
});
