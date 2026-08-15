from app.services.ai_service import generate_summary


sample_text = """
This study investigates the effect of climate change on agricultural
productivity in rural communities. The researchers analyzed data collected
from farmers over a five-year period. The results indicate that increasing
temperature and irregular rainfall were associated with reduced crop yields.
The study recommends improved irrigation systems and climate-resilient
farming practices.
"""


print("Connecting to GEMINI...")

summary = generate_summary(sample_text)

print("\n================ AI SUMMARY ================\n")
print(summary)
print("\n=============================================\n")