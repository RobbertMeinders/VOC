// Verplichte fallback voor de @modal parallel route: op elke URL die geen
// van de (.)-intercepting routes hieronder matcht, moet dit slot niets
// renderen (anders 404't Next.js op het slot zelf).
export default function Default() {
  return null;
}
