import { Component,
         OnInit ,
         ElementRef,
         ViewChild } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Chart } from 'chart.js';
import { PlaneService } from './../services/plane.service';

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

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  @ViewChild('radarLonLat') radarLonLatCanvas;
  @ViewChild('radarAlt') radarAltCanvas;
  
  //planeList: Observable<any>;
  public planeList: any[] = [];
  
  minDistance: any = -1;
  minAltitude: any = -1;
  notifierRayon: any = 0;
  notifierAltitude: any = 0;
  radarLonLat: any;
  colorArray: any;
  datasetArray: number[] = [];
  initCurrentLatitude: any = 43.927318;
  initCurrentLongitude: any = 4.994868;
  initCurrentAltitude: any = 0;
  currentHeading: any = 0;
  
  constructor(private planeService: PlaneService, private geolocation: Geolocation) {}

  ngOnInit() {
    window.addEventListener("compassneedscalibration", function(event) {
      alert("Calibration : Faire un 8");
      event.preventDefault();
    }, true);
    
    window.addEventListener("deviceorientation", this.processEventOrientation, true);
    
    console.log("ngOnInit()");
    this.planeService.searchData().subscribe(
      planeList => this.planeList = planeList
    );
  }

  ionViewDidEnter() {
    
    this.geolocation.getCurrentPosition()
    .then((resp) => {
      this.initCurrentLatitude = resp.coords.latitude;
      this.initCurrentLongitude = resp.coords.longitude;
    }).catch((error) => {
      console.log('Error getting location', error);
    });
    
    this.createRadarLonLat();
    setInterval(function() { this.updateRadarLonLat(); }.bind(this), 1000);
  }

  initDataset() {
    let dataArray: number[] = [];
    for (let i=0; i<360; i+=10) {
        dataArray.push(0.0);
    }
    dataArray[0] = 5000; // distance en mètre
   
    this.datasetArray = dataArray;
  }

  createRadarLonLat() {
    console.log("[createRadarLonLat]");
    this.initDataset();

    let labelArray: String[] = [];
    for (let i=0; i<360; i+=10) {
        let label = (i%30 == 0) ? String(i) : String("");
        labelArray.push(label);
    }
    //this.radarLonLatCanvas.nativeElement.height = 350;
    this.radarLonLat = new Chart(this.radarLonLatCanvas.nativeElement, {
      type: 'radar',
      data: {
        labels: labelArray,
        datasets: [{
          data: this.datasetArray
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 0
        },
        legend: {
          display: false
        },
      }
    });
  }

  updateRadarLonLat() {
    //console.log("init lon: ", this.initCurrentLongitude);
    //console.log("init lat: ", this.initCurrentLatitude);
    this.planeService.searchData().subscribe(
      planeList => this.planeList = planeList
    );
    
    //console.log("[update] planeList : ", this.planeList);
    this.radarLonLat.data.datasets = [];
    if (this.planeList.length > 0) {
      this.minDistance = -1;
      this.minAltitude = -1;
      for (let i=0; i<this.planeList.length; i++) {
        let plane = this.planeList[i];
        let distance = 0;
        let direction = i*2 + 3;
        // initialisation d'un vecteur pour un avion
        let newData = [];
        for (let i=0; i<360; i+=10) {
          newData.push(0.0);
        }
        
        // calcul distance
        let x = (plane.lon - this.initCurrentLongitude)*Math.cos((plane.lat + this.initCurrentLatitude)/2.);
        let y = plane.lat - this.initCurrentLatitude;
        let z = Math.sqrt(Math.pow(x, 2)+Math.pow(y, 2));
        distance = 1.852 * 60 * z;
        distance *= 1000.; // conversion km -> metre
        
        // méthode 1
        
        let longDelta = plane.lon - this.initCurrentLongitude;
        let dy = Math.sin(longDelta) * Math.cos(plane.lat);
        let dx = Math.cos(this.initCurrentLatitude) * Math.sin(plane.lat) - Math.sin(this.initCurrentLatitude) * Math.cos(plane.lat) * Math.cos(longDelta);
        direction = Math.atan(dy/dx) * 180/3.1415;
        if (direction < 0) {
          direction += 360;
        }
        direction = direction % 360;
        
        // méthode 2
        /*
        let dy = plane.lat - this.initCurrentLatitude;
        let dx = Math.cos(3.1415/180.*this.initCurrentLatitude) * (plane.lon - this.initCurrentLongitude);
        direction = Math.atan2(dy/dx);
        */
        //console.log("direction brute : ", direction);
        
        // on arrondit à la dizaine inférieure ou supérieure
        if (direction % 10 < 5) {
          direction = direction - direction % 10;
        } else {
          direction = direction - direction % 10 + 10;
        }
        //console.log("direction approx: ", direction);
        
        // modification du vecteur position de l'avion
        console.log("Flight : ", plane.flight, " (", distance, ", ", direction, ", ", plane.altitude, ")");
        newData[direction] = distance;

        plane.direction = direction;
        plane.distance = distance;

        // on met à jour la position du ième avion
        this.radarLonLat.data.datasets.push({data: newData});
        
        // récupération des minimums
        if (this.minDistance == -1 || this.minDistance > distance) {
          this.minDistance = Math.floor(distance);
        }
        if (this.minAltitude == -1 || this.minAltitude > plane.altitude) {
          this.minAltitude = plane.altitude;
        }
      }
    }
    // redraw chart
    this.radarLonLat.update();
  }
  
  processEventOrientation(event) {
    console.log("alpha: ", Math.round(event.alpha));
    console.log("beta: ", Math.round(event.beta));
    console.log("gamma: ", Math.round(event.gamma));
    
    console.log("Heading : " + (360 - Math.round(event.alpha)));
    this.currentHeading = 360 - Math.round(event.alpha);
  }

}

