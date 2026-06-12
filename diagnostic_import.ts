import { DateSchema } from "./packages/shared/src/schemas";
console.log("DateSchema check:", DateSchema ? "defined" : "undefined");
if (typeof DateSchema === 'undefined') {
  process.exit(1);
} else {
  console.log("DateSchema object:", JSON.stringify(DateSchema, () => "[object Object]", 2));
  process.exit(0);
}
