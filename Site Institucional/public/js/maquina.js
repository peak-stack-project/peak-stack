// O cadastro é um rascunho local. Nenhuma API de máquinas é chamada aqui.
var chaveRascunhoVM;
var dadosConfirmadosVM = null;
var camposTextoVM = [
    "nome_vm_input",
    "disco_vm_input",
    "ram_vm_input",
    "vcpus_vm_input",
    "ram_alerta_input",
    "ram_critico_input",
    "cpu_alerta_input",
    "cpu_critico_input",
    "disco_alerta_input",
    "disco_critico_input",
    "rede_alerta_input",
    "rede_critico_input"
];
var camposSelecaoVM = [
    "monitorar_cpu",
    "monitorar_ram",
    "monitorar_disco",
    "monitorar_rede"
];

function elementbyID(id) {
    return document.getElementById(id);
}

function avisarRascunhoVM(texto) {
    elementbyID("aviso_rascunho").textContent = texto;
    elementbyID("aviso_rascunho").hidden = false;
}

function salvarRascunhoVM() {
    var campos = {};
    camposTextoVM.forEach(function (id) { campos[id] = elementbyID(id).value; });
    camposSelecaoVM.forEach(function (id) { campos[id] = elementbyID(id).checked; });
    try {
        if (!chaveRascunhoVM) throw new Error("Sessão indisponível");
        localStorage.setItem(chaveRascunhoVM, JSON.stringify({ versao: 1, campos: campos }));
        elementbyID("aviso_rascunho").hidden = true;
        return true;
    } catch (erro) {
        avisarRascunhoVM("Não foi possível guardar o rascunho neste navegador. Você pode continuar, mas os dados poderão ser perdidos ao sair.");
        return false;
    }
}

function restaurarRascunhoVM() {
    try {
        var idUsuario = sessionStorage.getItem("ID_USUARIO");
        chaveRascunhoVM = "peakstack:rascunho-vm:" + (idUsuario ? "usuario:" + idUsuario : "visitante");
        var texto = localStorage.getItem(chaveRascunhoVM);
        if (!texto) return;
        var rascunho = JSON.parse(texto);
        if (!rascunho || rascunho.versao !== 1 || !rascunho.campos ||
            !camposTextoVM.every(function (id) { return typeof rascunho.campos[id] === "string" && rascunho.campos[id].length <= 150; }) ||
            !camposSelecaoVM.every(function (id) { return typeof rascunho.campos[id] === "boolean"; })) {
            throw new Error("Rascunho inválido");
        }
        camposTextoVM.forEach(function (id) { elementbyID(id).value = rascunho.campos[id]; });
        camposSelecaoVM.forEach(function (id) { elementbyID(id).checked = rascunho.campos[id]; });
    } catch (erro) {
        avisarRascunhoVM("O rascunho não pôde ser recuperado. Preencha o formulário para continuar.");
    }
}

function atualizarValidacaoVM() {
    var nome = elementbyID("nome_vm_input");

    nome.setCustomValidity(nome.value.trim() ? "" : "Informe o nome da VM.");

    ["disco_vm_input", "ram_vm_input", "vcpus_vm_input"].forEach(function (id) {
        var campo = elementbyID(id);
        var numero = campo.valueAsNumber;
        var valido = Number.isFinite(numero) && numero > 0;
        if (id === "vcpus_vm_input") valido = valido && Number.isSafeInteger(numero);
        campo.setCustomValidity(valido ? "" : id === "vcpus_vm_input" ? "Informe uma quantidade inteira e positiva de vCPUs." : "Informe uma capacidade maior que zero.");
    });
    var selecionou = camposSelecaoVM.some(function (id) { return elementbyID(id).checked; });
    elementbyID("monitorar_cpu").setCustomValidity(selecionou ? "" : "Selecione pelo menos um recurso.");

    // Seção de RAM
    var ativa_ram = elementbyID("monitorar_ram").checked;
    var secao_ram = elementbyID("discretizacao_ram");
    var campoX_ram = elementbyID("ram_alerta_input");
    var campoY_ram = elementbyID("ram_critico_input");

    secao_ram.hidden = !ativa_ram;
    secao_ram.disabled = !ativa_ram;
    campoX_ram.required = ativa_ram;
    campoY_ram.required = ativa_ram;
    campoX_ram.setCustomValidity("");
    campoY_ram.setCustomValidity("");

    var x_ram = campoX_ram.valueAsNumber;
    var y_ram = campoY_ram.valueAsNumber;
    var limitesValidos_ram = Number.isFinite(x_ram) && Number.isFinite(y_ram) && x_ram > 0 && x_ram < y_ram && y_ram < 100;

    if (ativa_ram && !limitesValidos_ram) {
        if (!Number.isFinite(x_ram) || x_ram <= 0 || x_ram >= 100) campoX_ram.setCustomValidity("Informe x maior que 0 e menor que 100.");
        if (!Number.isFinite(y_ram) || y_ram <= x_ram || y_ram >= 100 || y_ram <= 0) campoY_ram.setCustomValidity("Informe y maior que x e menor que 100.");
    }

    var faixas_ram = elementbyID("faixas_ram");
    var textos_ram = limitesValidos_ram ? [
        "Alerta: utilização a partir de " + x_ram.toLocaleString("pt-BR") + "%.",
        "Crítico: utilização a partir de " + y_ram.toLocaleString("pt-BR") + "%."
    ] : ["Preencha limites válidos: 0 < x < y < 100."];

    faixas_ram.replaceChildren();
    textos_ram.forEach(function (texto) {
        var linha = document.createElement("p");
        linha.textContent = texto;
        faixas_ram.appendChild(linha);
    });

    // Seção de CPU
    var ativa_cpu = elementbyID("monitorar_cpu").checked;
    var secao_cpu = elementbyID("discretizacao_cpu");
    var campoX_cpu = elementbyID("cpu_alerta_input");
    var campoY_cpu = elementbyID("cpu_critico_input");

    secao_cpu.hidden = !ativa_cpu;
    secao_cpu.disabled = !ativa_cpu;
    campoX_cpu.required = ativa_cpu;
    campoY_cpu.required = ativa_cpu;
    campoX_cpu.setCustomValidity("");
    campoY_cpu.setCustomValidity("");

    var x_cpu = campoX_cpu.valueAsNumber;
    var y_cpu = campoY_cpu.valueAsNumber;
    var limitesValidos_cpu = Number.isFinite(x_cpu) && Number.isFinite(y_cpu) && x_cpu > 0 && x_cpu < y_cpu && y_cpu < 100;

    if (ativa_cpu && !limitesValidos_cpu) {
        if (!Number.isFinite(x_cpu) || x_cpu <= 0 || x_cpu >= 100) campoX_cpu.setCustomValidity("Informe x maior que 0 e menor que 100.");
        if (!Number.isFinite(y_cpu) || y_cpu <= x_cpu || y_cpu >= 100 || y_cpu <= 0) campoY_cpu.setCustomValidity("Informe y maior que x e menor que 100.");
    }

    var faixas_cpu = elementbyID("faixas_cpu");
    var textos_cpu = limitesValidos_cpu ? [
        "Alerta: utilização a partir de " + x_cpu.toLocaleString("pt-BR") + "%.",
        "Crítico: utilização a partir de " + y_cpu.toLocaleString("pt-BR") + "%."
    ] : ["Preencha limites válidos: 0 < x < y < 100."];

    faixas_cpu.replaceChildren();
    textos_cpu.forEach(function (texto) {
        var linha = document.createElement("p");
        linha.textContent = texto;
        faixas_cpu.appendChild(linha);
    });

    // Seção de disco
    var ativa_disco = elementbyID("monitorar_disco").checked;
    var secao_disco = elementbyID("discretizacao_disco");
    var campoX_disco = elementbyID("disco_alerta_input");
    var campoY_disco = elementbyID("disco_critico_input");

    secao_disco.hidden = !ativa_disco;
    secao_disco.disabled = !ativa_disco;
    campoX_disco.required = ativa_disco;
    campoY_disco.required = ativa_disco;
    campoX_disco.setCustomValidity("");
    campoY_disco.setCustomValidity("");

    var x_disco = campoX_disco.valueAsNumber;
    var y_disco = campoY_disco.valueAsNumber;
    var limitesValidos_disco = Number.isFinite(x_disco) && Number.isFinite(y_disco) && x_disco > 0 && x_disco < y_disco && y_disco < 100;

    if (ativa_disco && !limitesValidos_disco) {
        if (!Number.isFinite(x_disco) || x_disco <= 0 || x_disco >= 100) campoX_disco.setCustomValidity("Informe x maior que 0 e menor que 100.");
        if (!Number.isFinite(y_disco) || y_disco <= x_disco || y_disco >= 100 || y_disco <= 0) campoY_disco.setCustomValidity("Informe y maior que x e menor que 100.");
    }

    var faixas_disco = elementbyID("faixas_disco");
    var textos_disco = limitesValidos_disco ? [
        "Alerta: utilização a partir de " + x_disco.toLocaleString("pt-BR") + "%.",
        "Crítico: utilização a partir de " + y_disco.toLocaleString("pt-BR") + "%."
    ] : ["Preencha limites válidos: 0 < x < y < 100."];

    faixas_disco.replaceChildren();
    textos_disco.forEach(function (texto) {
        var linha = document.createElement("p");
        linha.textContent = texto;
        faixas_disco.appendChild(linha);
    });

    // Seção de rede
    var ativa_rede = elementbyID("monitorar_rede").checked;
    var secao_rede = elementbyID("discretizacao_rede");
    var campoX_rede = elementbyID("rede_alerta_input");
    var campoY_rede = elementbyID("rede_critico_input");

    secao_rede.hidden = !ativa_rede;
    secao_rede.disabled = !ativa_rede;
    campoX_rede.required = ativa_rede;
    campoY_rede.required = ativa_rede;
    campoX_rede.setCustomValidity("");
    campoY_rede.setCustomValidity("");

    var x_rede = campoX_rede.valueAsNumber;
    var y_rede = campoY_rede.valueAsNumber;
    var limitesValidos_rede = Number.isFinite(x_rede) && Number.isFinite(y_rede) && x_rede > 0 && x_rede < y_rede && y_rede < 100;

    if (ativa_rede && !limitesValidos_rede) {
        if (!Number.isFinite(x_rede) || x_rede <= 0 || x_rede >= 100) campoX_rede.setCustomValidity("Informe x maior que 0 e menor que 100.");
        if (!Number.isFinite(y_rede) || y_rede <= x_rede || y_rede >= 100 || y_rede <= 0) campoY_rede.setCustomValidity("Informe y maior que x e menor que 100.");
    }

    var faixas_rede = elementbyID("faixas_rede");
    var textos_rede = limitesValidos_rede ? [
        "Crítico: utilização abaixo de " + x_rede.toLocaleString("pt-BR") + "%.",
        "Alerta: utilização abaixo de " + y_rede.toLocaleString("pt-BR") + "%."
    ] : ["Preencha limites válidos: 0 < x < y < 100."];

    faixas_rede.replaceChildren();
    textos_rede.forEach(function (texto) {
        var linha = document.createElement("p");
        linha.textContent = texto;
        faixas_rede.appendChild(linha);
    });
}

function montarDadosVM() {
    var dados = {
        nomeMaquina: elementbyID("nome_vm_input").value.trim(),
        discoTotalGb: elementbyID("disco_vm_input").valueAsNumber,
        ramTotalGb: elementbyID("ram_vm_input").valueAsNumber,
        vcpus: elementbyID("vcpus_vm_input").valueAsNumber,
        recursos: {
            cpu: elementbyID("monitorar_cpu").checked,
            ram: elementbyID("monitorar_ram").checked,
            disco: elementbyID("monitorar_disco").checked,
            rede: elementbyID("monitorar_rede").checked
        }
    };

    if (dados.recursos.ram) dados.limitesRam = { AlertaApartirDe: elementbyID("ram_alerta_input").valueAsNumber, CriticoApartirDe: elementbyID("ram_critico_input").valueAsNumber };
    if (dados.recursos.cpu) dados.limitesCpu = { AlertaApartirDe: elementbyID("cpu_alerta_input").valueAsNumber, CriticoApartirDe: elementbyID("cpu_critico_input").valueAsNumber };
    if (dados.recursos.disco) dados.limitesDisco = { AlertaApartirDe: elementbyID("disco_alerta_input").valueAsNumber, CriticoApartirDe: elementbyID("disco_critico_input").valueAsNumber };
    if (dados.recursos.rede) dados.limitesRede = { AlertaApartirDe: elementbyID("rede_alerta_input").valueAsNumber, CriticoApartirDe: elementbyID("rede_critico_input").valueAsNumber };

    return dados;
}

document.addEventListener("DOMContentLoaded", function () {
    var formulario = elementbyID("form_vm");
    restaurarRascunhoVM();
    atualizarValidacaoVM();
    function alterar() {
        dadosConfirmadosVM = null;
        elementbyID("mensagem_vm").hidden = true;
        atualizarValidacaoVM();
        salvarRascunhoVM();
    }
    formulario.addEventListener("input", alterar);
    formulario.addEventListener("change", function (evento) {
        alterar();
        if (camposSelecaoVM.indexOf(evento.target.id) !== -1) registrar_checkpoint("alterou_recursos_vm");
    });
    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        atualizarValidacaoVM();
        if (!formulario.reportValidity()) return;
        dadosConfirmadosVM = montarDadosVM();
        var salvo = salvarRascunhoVM();
        var mensagem = elementbyID("mensagem_vm");
        mensagem.textContent = salvo
            ? "Máquina e métricas cadastradas — somente como rascunho neste navegador. Nenhuma VM foi cadastrada no banco."
            : "Dados validados nesta tela. O rascunho não foi salvo e nenhuma VM foi cadastrada no banco.";
        mensagem.hidden = false;
        registrar_checkpoint("validou_cadastro_vm");
    });
});
