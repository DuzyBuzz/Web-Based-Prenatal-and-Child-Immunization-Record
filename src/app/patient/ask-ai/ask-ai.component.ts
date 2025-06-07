import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ask-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ask-ai.component.html',
  styleUrls: ['./ask-ai.component.scss'],
})
export class AskAiComponent {
  userMessage = '';
  loading = false;
  selectedLanguage: 'tagalog' | 'english' | 'ilongo' = 'ilongo'; // default language
  selectedCategory = ''; // default category

  chatHistory: { role: 'user' | 'ai'; message: string; category: string; timestamp: Date }[] = [];

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  // Suggestions for the user to click
  suggestionPrompts: { key: string; tagalog: string; english: string; ilongo: string }[] = [
    {
      key: 'prenatal-nutrition',
      tagalog: 'Ano ang tamang pagkain para sa buntis?',
      english: 'What is the proper diet for pregnant women?',
      ilongo: 'Ano ang maayo nga pagkaon para sa nagabusong?'
    },
    {
      key: 'vaccine-schedule',
      tagalog: 'Kailan dapat pabakunahan ang aking anak?',
      english: 'When should my child get vaccinated?',
      ilongo: 'San-o dapat pabakunahan ang bata ko?'
    },
    {
      key: 'danger-signs',
      tagalog: 'Ano ang mga delikadong senyales ng pagbubuntis?',
      english: 'What are the danger signs in pregnancy?',
      ilongo: 'Ano ang mga delikado nga senyales sang pagbubuntis?'
    }
  ];

  showSuggestions = true;

  // 🔐 EXPOSED — only for testing! Do NOT use this in production
  private readonly API_KEY = 'AIzaSyAmoDwkQ2LaOjDYN7zoGBYxxlY24nfRw9A';
  private readonly GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.API_KEY}`;

  constructor(private http: HttpClient, private firestore: Firestore) {}

  onSuggestionClick(suggestion: string) {
    this.userMessage = suggestion;
    this.showSuggestions = false;
  }

  async sendMessage() {
    const trimmedMessage = this.userMessage.trim();
    if (!trimmedMessage) return;

    const timestamp = new Date();
    this.appendMessage('user', trimmedMessage, timestamp);
    this.userMessage = '';
    this.loading = true;
    this.showSuggestions = false;

    await this.saveMessageToFirestore('user', trimmedMessage, timestamp);

    try {
      // Set the question label based on selected language
      let questionLabel = '';
      switch (this.selectedLanguage) {
        case 'ilongo':
          questionLabel = 'Pamangkot sang user';
          break;
        case 'english':
          questionLabel = 'User question';
          break;
        default: // tagalog
          questionLabel = 'Tanong ng user';
      }

      const aiInput = `${questionLabel}: ${trimmedMessage}`;

      const body = {
        contents: [
          {
            parts: [
              { text: aiInput }
            ]
          }
        ]
      };

      const response: any = await this.http.post(this.GEMINI_URL, body).toPromise();
      const aiReply = response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Pasensya na, walang sagot ang AI.';
      const aiTimestamp = new Date();

      this.appendMessage('ai', aiReply, aiTimestamp);
      await this.saveMessageToFirestore('ai', aiReply, aiTimestamp);
    } catch (error) {
      console.error('[Error] Gemini API call failed:', error);
      const fallbackReply = 'May error sa AI. Subukang muli.';
      this.appendMessage('ai', fallbackReply, new Date());
    } finally {
      this.loading = false;
      this.scrollToBottom();
    }
  }

  appendMessage(role: 'user' | 'ai', message: string, timestamp: Date) {
    this.chatHistory.push({ role, message, category: this.selectedCategory, timestamp });
  }

  async saveMessageToFirestore(role: 'user' | 'ai', message: string, timestamp: Date) {
    await addDoc(collection(this.firestore, 'chatHistory'), {
      role,
      message,
      category: this.selectedCategory,
      timestamp,
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      this.scrollContainer?.nativeElement.scrollTo({
        top: this.scrollContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }

  getCategoryPrompt(category: string): string {
    switch (this.selectedLanguage) {
      case 'ilongo':
        switch (category) {
          case 'prenatal-nutrition':
            return 'Ikaw isa ka AI nga nagabulig sa prenatal nutrition sa Hiligaynon. Sabta ang mga pamangkot parte sa pagkaon, bitamina, kag healthy nga pamatasan sang nagabusong.';
          case 'vaccine-schedule':
            return 'Ikaw isa ka AI nga nagabulig sa bakuna sang bata. Sabta ang pamangkot sang ginikanan parte sa hustong edad sang pagpabakuna.';
          case 'danger-signs':
            return 'Ikaw isa ka AI nga nagahatag sang pahimangno sa mga delikado nga senyales sang pagbubuntis. Sabta sa Hiligaynon, mahinay kag propesyonal.';
          default:
            return 'Ikaw isa ka AI assistant sa Hiligaynon nga nagabulig sa prenatal kag child immunization.';
        }
      case 'english':
        switch (category) {
          case 'prenatal-nutrition':
            return 'You are an AI that helps with prenatal nutrition. Answer questions about food, vitamins, and healthy practices for pregnant women.';
          case 'vaccine-schedule':
            return 'You are an AI that helps with child vaccination. Answer parents’ questions about the proper age for vaccination.';
          case 'danger-signs':
            return 'You are an AI that warns about dangerous signs in pregnancy. Answer in English, carefully and professionally.';
          default:
            return 'You are an AI assistant in English that helps with prenatal and child immunization.';
        }
      default: // tagalog
        switch (category) {
          case 'prenatal-nutrition':
            return 'Ikaw ay isang AI na tumutulong sa prenatal nutrition sa wikang Tagalog. Sagutin mo ang mga tanong tungkol sa pagkain, vitamins, at healthy practices ng buntis.';
          case 'vaccine-schedule':
            return 'Ikaw ay isang AI na tumutulong sa bakuna ng bata. Sagutin mo ang tanong ng mga magulang tungkol sa tamang edad ng pagbabakuna.';
          case 'danger-signs':
            return 'Ikaw ay isang AI na nagbibigay babala sa mga delikadong senyales ng pagbubuntis. Sagutin sa Tagalog, maingat at propesyonal.';
          default:
            return 'Ikaw ay AI assistant sa Tagalog na tumutulong sa prenatal at child immunization.';
        }
    }
  }
}
