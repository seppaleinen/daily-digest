import { CreateItemSchema, DateSchema } from "@daily-digest/shared";

console.log("Checking DateSchema:", typeof DateSchema);
console.log("Checking CreateItemSchema:", typeof CreateItemSchema);

if (typeof CreateItemSchema === 'object') {
  console.log("CreateItemSchema shape keys:", Object.keys(CreateItemSchema.shape));
}

if (typeof DateSchema === 'undefined') {
  console.error("CRITICAL: DateSchema is undefined!");
} else {
  console.log("SUCCESS: DateSchema is defined.");
}
