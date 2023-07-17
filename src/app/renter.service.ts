import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Renter } from './model/renter';

@Injectable({
  providedIn: 'root'
})
export class RenterService {
  private renterUrl = 'http://localhost:8080/renter';

  constructor(private http: HttpClient) { }

  public getRenters(): Observable<Renter[]> {
    return this.http.get<Renter[]>(`${this.renterUrl}/all`);
  }

  public addRenter(renter: Renter): Observable<Renter> {
    return this.http.post<Renter>(`${this.renterUrl}/add`, renter);
  }
}
