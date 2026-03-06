import { tipsUseCases } from "../../container.js";

// POST /api/tips
export const sendTip = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { post_id, amount, message } = req.body;

    if (!post_id) {
      return res.status(400).json({ message: "post_id diperlukan" });
    }

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ message: "amount harus berupa angka" });
    }

    const result = await tipsUseCases.sendTip(
      senderId,
      post_id,
      amount,
      message,
    );
    res.status(201).json({ data: result });
  } catch (error) {
    console.error("Send tip error:", error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};

// GET /api/tips/activity
export const getTipsActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await tipsUseCases.getTipsActivity(userId, page, limit);
    res.status(200).json({ data: result });
  } catch (error) {
    console.error("Get tips activity error:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil tips activity", error: error.message });
  }
};
