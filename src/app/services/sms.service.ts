// sms.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SmsService {
  private apiUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';
  private reminderUrl = 'https://sms.iprogtech.com/api/v1/message-reminders';
  private apiToken = '46a41b56a940789fc2ef1178f6151a79d8639ec4';

  constructor(private http: HttpClient) {}

  sendSms(phone_number: string, message: string): Observable<any> {
    const params = new HttpParams()
      .set('api_token', this.apiToken)
      .set('message', message)
      .set('phone_number', phone_number);

    return this.http.post(this.apiUrl, null, { params });
  }

  scheduleSmsReminder(phone_number: string, message: string, scheduled_at: string): Observable<any> {
    const params = new HttpParams()
      .set('api_token', this.apiToken)
      .set('message', message)
      .set('phone_number', phone_number)
      .set('scheduled_at', scheduled_at); // Format: YYYY-MM-DD HH:mmA (e.g., 2025-03-08 05:00AM)

    return this.http.post(this.reminderUrl, null, { params });
  }
}
