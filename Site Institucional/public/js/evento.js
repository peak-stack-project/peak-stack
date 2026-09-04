var quantidadeLotes = 0;

function adicionarLote() {
    quantidadeLotes++;

    var containerLotes = document.getElementById("container_lotes");
    var lote = document.createElement("div");
    var identificador = quantidadeLotes;

    lote.className = "lote_item";
    lote.id = "lote_" + identificador;
    lote.innerHTML = `
        <div class="campo">
            <label for="nome_lote_${identificador}">Nome</label>
            <input id="nome_lote_${identificador}" type="text" placeholder="Ex.: 1º lote" required>
        </div>
        <div class="campo">
            <label for="preco_lote_${identificador}">Preço</label>
            <input id="preco_lote_${identificador}" type="number" min="0" step="0.01" placeholder="0,00" required>
        </div>
        <div class="campo">
            <label for="quantidade_lote_${identificador}">Quantidade</label>
            <input id="quantidade_lote_${identificador}" type="number" min="1" placeholder="0" required>
        </div>
        <button class="remover_lote" type="button" aria-label="Remover lote" onclick="removerLote(${identificador})">×</button>
    `;

    containerLotes.appendChild(lote);
    registrar_checkpoint("adicionou_lote_formulario");
}

function removerLote(identificador) {
    var lotes = document.querySelectorAll(".lote_item");
    var lote = document.getElementById("lote_" + identificador);
    var mensagem = document.getElementById("mensagem_evento");

    if (lotes.length == 1) {
        mensagem.style.display = "block";
        mensagem.innerHTML = "Mantenha pelo menos um lote no evento.";
        return;
    }

    if (lote) lote.remove();
    mensagem.style.display = "none";
    registrar_checkpoint("removeu_lote_formulario");
}

function finalizarEventoVisual(evento) {
    evento.preventDefault();

    var mensagem = document.getElementById("mensagem_evento");
    mensagem.style.display = "block";
    mensagem.innerHTML = "Estrutura validada visualmente. Nenhuma informação foi salva neste MVP.";
    registrar_checkpoint("validou_formulario_evento");
}

document.addEventListener("DOMContentLoaded", function () {
    adicionarLote();
});
