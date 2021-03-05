import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { tap } from 'rxjs/operators';

export class Plane {
  public static fromJson(json: Object): Plane {
    return new Plane(
      json["hex"],
      json["flight"],
      json["lat"],
      json["lon"],
      json["altitude"],
      json["track"],
      json["speed"]
    );
  }

  constructor(
    public hex: string,
    public flight: string,
    public lat: number,
    public lon: number,
    public altitude: number,
    public track: number,
    public speed: number) {
  }
}

@Injectable({
  providedIn: 'root'
})
export class PlaneService {
  url: string = 'http://192.168.0.190:80/data.json';
  
  constructor(private http: HttpClient) { }
  
  public searchData(): Observable<Plane[]> {
    //console.log("searchData call");
    //console.log("searchData, url : ", this.url);
    return this.http.get(this.url)
      .pipe(
        tap((value) => value),//console.log('Avant : ' + value)),
        map(
          (jsonArray: Object[]) => jsonArray.map(jsonItem => Plane.fromJson(jsonItem))
        )
      );
  }
}
