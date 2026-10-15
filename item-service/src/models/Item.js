const mongoose = require('mongoose');

const CATEGORIES = ['Electronics', 'ID Card', 'Books', 'Bags', 'Keys', 'Wallet', 'Clothing', 'Bottle', 'Accessories', 'Other'];

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 1000 },
    type: { type: String, enum: ['lost', 'found'], required: [true, 'Type (lost/found) is required'] },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    location: { type: String, required: [true, 'Location is required'], trim: true },
    date: { type: Date, required: [true, 'Date is required'] },
    imageUrl: { type: String, trim: true, default: '' },
    reporterName: { type: String, required: [true, 'Reporter name is required'], trim: true },
    reporterEmail: {
      type: String,
      required: [true, 'Reporter email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    reporterPhone: { type: String, trim: true, default: '' },
    // Account (User Service) that posted the report
    reporterId: { type: String, default: '', index: true },
    // open -> claimed (set by Claim Service on approval) -> resolved/closed
    status: { type: String, enum: ['open', 'claimed', 'resolved'], default: 'open' },
    claimedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

itemSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Item', itemSchema);
module.exports.CATEGORIES = CATEGORIES;
