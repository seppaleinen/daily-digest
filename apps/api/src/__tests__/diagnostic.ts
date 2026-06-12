import { DateSchema } from "@daily-digest/shared";
import { CreateItemSchema } from "@daily-digest/shared";

console.log("Checking DateSchema:", typeof DateSchema);
console.log("Checking CreateItemSchema:", typeof CreateItemSchema);

if (typeof DateSchema !== 'object') {
  console.error("CRITICAL: DateSchema is NOT an object!");
  process.exit(1);
} else {
  console.log("SUCCESS: DateSchema is defined and is an object.");
}
