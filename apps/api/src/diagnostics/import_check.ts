import { DateSchema } from "@daily-digest/shared";
import { CreateItemSchema } from "@daily-digest/shared";

console.log("DateSchema:", DateSchema);
console.log("CreateItemSchema:", CreateItemSchema);

if (DateSchema === undefined) {
  process.exit(1);
} else {
  process.exit(0);
}
