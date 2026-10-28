const eloSlider = document.getElementById("elo");
const muSlider = document.getElementById("mu");
const kSlider = document.getElementById("K");
const resetButton = document.getElementById("reset-button");

function factorial(n) {
if (n < 0) return undefined;
let result = 1;
for (let i = 2; i <= n; i++) {
  result *= i;
}
return result;
}

function poissonPMF(n, lambda) {
return (lambda ** n) * Math.exp(-1*lambda) / factorial(n);
}

function expectedGoals(mu, k, eloDiff) {
return mu * Math.exp(k * eloDiff / 400);
}

function updateChart() {
document.getElementById("elo-value").textContent = eloSlider.value;
document.getElementById("mu-value").textContent = muSlider.value;
document.getElementById("K-value").textContent = kSlider.value;
const eloDiff = Number(eloSlider.value);
const mu = Number(muSlider.value);
const k = Number(kSlider.value);
const lambdaA = expectedGoals(mu, k, eloDiff);
const lambdaB = expectedGoals(mu, k, -eloDiff);
document.getElementById("team-a-xG").textContent = `Team A: λ = ${lambdaA.toFixed(2)} xG`;
document.getElementById("team-b-xG").textContent = `Team B: λ = ${lambdaB.toFixed(2)} xG`;
for (let n = 0; n <= 6; n++) {
  const barA = document.getElementById(`bar-a-${n}`);
  const barB = document.getElementById(`bar-b-${n}`);
  const probNGoalsA = poissonPMF(n, lambdaA);
  const probNGoalsB = poissonPMF(n, lambdaB);
  const newHeightA = probNGoalsA * 200;
  const newHeightB = probNGoalsB * 200;
  const newYA = 200 - newHeightA;
  const newYB = 200 - newHeightB;
  barA.setAttribute("height", newHeightA);
  barA.setAttribute("y", newYA);
  barB.setAttribute("height", newHeightB);
  barB.setAttribute("y", newYB);
}
}

eloSlider.addEventListener("input", updateChart);
muSlider.addEventListener("input", updateChart);
kSlider.addEventListener("input", updateChart);
resetButton.addEventListener("click", () => {
eloSlider.value = 0;
muSlider.value = 1.35;
kSlider.value = 0.5;
updateChart();
});
updateChart();
