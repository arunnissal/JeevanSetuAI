export const healthTips = [
  "Stay hydrated. Aim for 8-10 glasses of water daily.",
  "Carry your emergency contact information at all times.",
  "Schedule regular health checkups once a year.",
  "Aim for at least 7-8 hours of sleep each night.",
  "Practice deep breathing exercises to reduce daily stress.",
  "Exercise at least 30 minutes a day, five times a week.",
  "Incorporate more fresh fruits and green vegetables into your meals.",
  "Limit processed foods and high-sugar beverages.",
  "Stand up and stretch every hour if you work at a desk.",
  "Wash your hands frequently to prevent the spread of germs.",
  "Keep a record of your medical history and allergies updated.",
  "Get your annual flu shot and keep vaccination records current.",
  "Avoid using digital screens for at least 30 minutes before sleep.",
  "Maintain a regular meal schedule to boost metabolism.",
  "Add probiotics like yogurt to your diet for better gut health.",
  "Spend 15 minutes outdoors daily for natural Vitamin D.",
  "Practice good posture when sitting and walking.",
  "Avoid self-medicating; always consult a doctor.",
  "Take short active breaks during long work hours.",
  "Check your blood pressure regularly and track updates."
];

export const getDailyTip = (tips: string[] = healthTips) => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = Math.abs(dayOfYear) % tips.length;
  return tips[index];
};
