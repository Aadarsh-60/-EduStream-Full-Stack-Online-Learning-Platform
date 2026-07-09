import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Razorpay IDs
    razorpayOrderId:   { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    amount:   { type: Number, required: true }, // paise mein (100 = ₹1)
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: ['pending', 'captured', 'failed', 'refunded'],
      default: 'pending',
    },

    // Idempotency - same webhook dobara process na ho
    webhookProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
