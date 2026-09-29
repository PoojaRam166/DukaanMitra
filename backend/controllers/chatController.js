exports.sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    // Mocking an AI backend response (like an LLM would)
    let reply = "I can help you with sales predictions, inventory management, and profit insights. What would you like to know?";
    
    if (message) {
      const lcMessage = message.toLowerCase();
      if (lcMessage.includes("sales") || lcMessage.includes("predict")) {
        reply = "Based on recent data, I predict a 15% increase in sales this weekend.";
      } else if (lcMessage.includes("stock") || lcMessage.includes("inventory")) {
        reply = "You are running low on some top-selling items. I recommend checking the inventory page for restock suggestions.";
      } else if (lcMessage.includes("profit")) {
        reply = "Your net profit margin is currently 22%, which is 2% higher than last month. Great job!";
      } else {
        reply = "I'm connected to the real backend! I processed: '" + message + "'. (This is a mock LLM response).";
      }
    }

    // Add a slight delay to simulate processing time
    setTimeout(() => {
      res.json({ success: true, data: reply });
    }, 1000);
  } catch (error) {
    next(error);
  }
};
