// services/emailService.js

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

exports.sendTaskAssignmentEmail = async (toEmail, task) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `You have been assigned a new task: ${task.title}`,
    html: `
      <h1>Task Assignment</h1>
      <p>Hello,</p>
      <p>You have been assigned a new task: <strong>${task.title}</strong>.</p>
      <p>Description: ${task.description}</p>
      <p>Due Date: ${task.dueDate ? new Date(task.dueDate).toDateString() : 'N/A'}</p>
      <p>Please check the platform for more details.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (err) {
    console.error('Error sending email:', err);
  }
};