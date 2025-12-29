import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to MediExplain API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Sample API endpoint
app.get("/api/data", (req: Request, res: Response) => {
  res.json({
    data: [
      { id: 1, name: "Item 1", description: "Sample item 1" },
      { id: 2, name: "Item 2", description: "Sample item 2" },
      { id: 3, name: "Item 3", description: "Sample item 3" },
    ],
  });
});

app.post("/api/data", (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: "Name and description are required" });
  }

  res.status(201).json({
    message: "Data created successfully",
    data: { id: Date.now(), name, description },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(
    `📊 Health check available at http://localhost:${PORT}/api/health`
  );
});
