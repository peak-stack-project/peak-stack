function validarSessao() {
    var email = sessionStorage.EMAIL_USUARIO;
    var nome = sessionStorage.NOME_USUARIO;
    var idUsuario = sessionStorage.ID_USUARIO;
    var bUsuario = document.getElementById("b_usuario");

    if (email != null && nome != null && idUsuario != null) {
        if (bUsuario) bUsuario.innerHTML = nome;
    } else {
        window.location = "/login.html";
    }
}

function limparSessao() {
    registrar_checkpoint("logout_peakstack", sessionStorage.ID_USUARIO);
    sessionStorage.clear();
    window.location = "/login.html";
}

function ajustarNavbarSessao() {
    var idUsuario = sessionStorage.ID_USUARIO;
    var linkLogin = document.getElementById("link_login");
    var linkCadastro = document.getElementById("link_cadastro");
    var botaoLogout = document.getElementById("btn_logout");

    if (linkLogin) linkLogin.style.display = idUsuario == undefined ? "block" : "none";
    if (linkCadastro) linkCadastro.style.display = idUsuario == undefined ? "block" : "none";
    if (botaoLogout) botaoLogout.style.display = idUsuario == undefined ? "none" : "block";
}

function aguardar() {
    var divAguardar = document.getElementById("div_aguardar");
    if (divAguardar) divAguardar.style.display = "flex";
}

function finalizarAguardar(texto) {
    var divAguardar = document.getElementById("div_aguardar");
    var divErrosLogin = document.getElementById("div_erros_login");

    if (divAguardar) divAguardar.style.display = "none";
    if (texto && divErrosLogin) {
        divErrosLogin.style.display = "flex";
        divErrosLogin.innerHTML = texto;
    }
}

function registrar_checkpoint(etapaFluxo, fkUsuario) {
    var idUsuarioSessao = sessionStorage.ID_USUARIO;

    fetch("/metricas/registrar", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            etapaServer: etapaFluxo,
            idUsuarioServer: fkUsuario || idUsuarioSessao
        })
    }).then(function (resposta) {
        if (!resposta.ok) console.warn("Checkpoint não registrado: " + etapaFluxo);
    }).catch(function () {
        console.warn("Rastreabilidade indisponível para: " + etapaFluxo);
    });
}

document.addEventListener("DOMContentLoaded", ajustarNavbarSessao);
