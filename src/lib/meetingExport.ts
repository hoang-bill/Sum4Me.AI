import { MeetingHistory } from './meetingHistory';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

export function exportMeetingToPDF(meeting: MeetingHistory) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;
  const lineHeight = 7;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Title
  pdf.setFontSize(20);
  pdf.text(meeting.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += lineHeight * 2;

  // Date
  pdf.setFontSize(12);
  pdf.text(`Date: ${format(new Date(meeting.timestamp), 'PPpp')}`, margin, yPos);
  yPos += lineHeight * 2;

  // Summary Section
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('Summary', margin, yPos);
  yPos += lineHeight;

  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  meeting.summary.forEach(point => {
    const bulletPoint = `• ${point}`;
    const splitPoint = pdf.splitTextToSize(bulletPoint, contentWidth);
    
    // Add new page if needed
    if (yPos + (lineHeight * splitPoint.length) > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
    
    pdf.text(splitPoint, margin, yPos);
    yPos += lineHeight * splitPoint.length;
  });
  yPos += lineHeight;

  // Action Items Section
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('Action Items', margin, yPos);
  yPos += lineHeight;

  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  meeting.actionItems.forEach(item => {
    const bulletPoint = `• ${item}`;
    const splitItem = pdf.splitTextToSize(bulletPoint, contentWidth);
    
    if (yPos + (lineHeight * splitItem.length) > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
    
    pdf.text(splitItem, margin, yPos);
    yPos += lineHeight * splitItem.length;
  });
  yPos += lineHeight;

  // Sentiment Analysis Section
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('Sentiment Analysis', margin, yPos);
  yPos += lineHeight;

  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  const sentimentColor = meeting.sentiment.overall === 'positive' ? '#006400' : 
                        meeting.sentiment.overall === 'negative' ? '#FF0000' : 
                        '#000000';
  
  pdf.setTextColor(sentimentColor);
  pdf.text(`Overall Tone: ${meeting.sentiment.overall.toUpperCase()}`, margin, yPos);
  yPos += lineHeight;
  
  pdf.setTextColor('#000000');
  pdf.text(`Positive Score: ${Math.round(meeting.sentiment.positive * 100)}%`, margin, yPos);
  yPos += lineHeight;
  pdf.text(`Negative Score: ${Math.round(meeting.sentiment.negative * 100)}%`, margin, yPos);
  yPos += lineHeight * 2;

  // Transcript Section
  if (yPos > pdf.internal.pageSize.getHeight() - 40) {
    pdf.addPage();
    yPos = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('Full Transcript', margin, yPos);
  yPos += lineHeight;

  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  const splitTranscript = pdf.splitTextToSize(meeting.text, contentWidth);
  splitTranscript.forEach(line => {
    if (yPos > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
    pdf.text(line, margin, yPos);
    yPos += lineHeight;
  });

  // Save the PDF
  const fileName = `${meeting.title.toLowerCase().replace(/\s+/g, '-')}-summary.pdf`;
  pdf.save(fileName);
}

export async function emailMarkdown(meeting: MeetingHistory, email: string): Promise<void> {
  const trimmedEmail = email.trim();
  
  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Invalid email address format');
  }
  
  try {
    const templateParams = {
      to_email: trimmedEmail,
      from_name: "Meeting Assistant",
      to_name: trimmedEmail.split('@')[0],
      subject: `Meeting Summary: ${meeting.title}`,
      message: meeting.text,
    };

    const response = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );

    if (response.status !== 200) {
      throw new Error(`Failed to send email: ${response.text}`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  const disposableDomains = ['tempmail.com', 'throwaway.com'];
  const domain = email.split('@')[1].toLowerCase();
  if (disposableDomains.includes(domain)) {
    return false;
  }

  return true;
}