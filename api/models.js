export default function handler(req, res) {
  res.json({
    object: "list",
    data: [{ id: "duckai", object: "model", owned_by: "duckduckgo" }]
  });
}
