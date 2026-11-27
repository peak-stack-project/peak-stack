// Regressão linear simples por mínimos quadrados ordinários (OLS): y = a·x + b
//   a (coeficiente angular) = quanto o uso do disco cresce por dia (p.p./dia)
//   b (intercepto)          = uso "ajustado" pela reta no dia de hoje (x = 0)
//   r2 (coeficiente de determinação) = 0..1, o quanto a reta explica os dados
//
// pontos: [{ x: deslocamento em dias em relação a hoje (…, -2, -1, 0), y: uso % }]
function regressaoLinear(pontos) {
    var n = pontos.length;
    if (n < 2) return null;

    var somaX = 0, somaY = 0, somaXX = 0, somaXY = 0;
    pontos.forEach(function (p) {
        somaX += p.x;
        somaY += p.y;
        somaXX += p.x * p.x;
        somaXY += p.x * p.y;
    });

    var denominador = n * somaXX - somaX * somaX;
    if (denominador === 0) return null; // todos os x iguais: não existe reta

    var a = (n * somaXY - somaX * somaY) / denominador;
    var b = (somaY - a * somaX) / n;

    // R² = 1 - SQres / SQtot
    var mediaY = somaY / n;
    var sqTotal = 0, sqResiduo = 0;
    pontos.forEach(function (p) {
        sqTotal += Math.pow(p.y - mediaY, 2);
        sqResiduo += Math.pow(p.y - (a * p.x + b), 2);
    });
    var r2 = sqTotal === 0 ? 1 : 1 - sqResiduo / sqTotal;

    return { a: a, b: b, r2: r2 };
}

module.exports = { regressaoLinear };
