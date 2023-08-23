import { Component, OnInit } from '@angular/core';
import { Residence } from '../model/residence';
import { ResidenceService } from '../service/residence.service';
import { ActivatedRoute} from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { Photo } from '../model/photo';
import { PhotoService } from '../service/photo.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Reservation } from '../model/reservation';
import { ReservationService } from '../service/reservation.service';
import { formatDate } from '@angular/common';
import { RenterService } from '../service/renter.service';
import { Renter } from '../model/renter';
import { MessageResponse } from '../model/messageResponse';
import { PageResponse } from '../model/pageResponse';
import * as Leaflet from 'leaflet';

@Component({
  selector: 'app-residence',
  templateUrl: './residence.component.html',
  styleUrls: ['./residence.component.css']
})
export class ResidenceComponent implements OnInit{
  public residence: Residence;
  public ishost: boolean;
  public isrenter: boolean;
  public id: number;
  public isWifiChecked: boolean;
  public isHeatingChecked: boolean;
  public isAirConditionChecked: boolean;
  public isCuisineChecked: boolean;
  public isTvChecked: boolean;
  public isParkingChecked: boolean;
  public isElevatorChecked: boolean;
  public isLivingRoomChecked: boolean;
  public photos: Photo[];
  public deletePhoto: Photo;
  public urls: String[];
  public names: String[];
  public renter_id: number = 0;
  public reservations: Reservation[] = [];
  public checkIn: string = "";
  public checkOut: string = "";
  public renter: Renter = {id:0, username:'', firstName:'', lastName:'', password:'', email:'', phoneNumber: '', photo: ''};
  public recordsNumber: number = 0;
  public fromRecord: number = 0;
  public toRecord: number = 0;
  public pages: number = 1;
  public previousPage: number = 0;
  public nextPage: number = 0;
  public currentPage: number = 0;
  public roomType: string = "";
  public coordinateX: number = 0.0;
  public coordinateY: number = 0.0;
  

  constructor(private route: ActivatedRoute, private residenceService: ResidenceService, private photoService: PhotoService, private jwtHelper: JwtHelperService,
    private reservationService: ReservationService, private renterService: RenterService) { 
    this.ishost = false; 
    this.isrenter = false;
    this.id = 0;
    this.isWifiChecked = false;
    this.isHeatingChecked = false;
    this.isAirConditionChecked = false;
    this.isCuisineChecked = false;
    this.isTvChecked = false;
    this.isParkingChecked = false;
    this.isElevatorChecked = false;
    this.isLivingRoomChecked = false;
    this.photos = [];
    this.urls = [];
    this.names = [];

    this.residence = {id:0, photo:'', reviewsNumber: 0, starsAverage: 1, available_from:'', available_till:'', pricing:0.0, city:'', area:"", address:"", floor:0, 
    coordinateX:0.0, coordinateY: 0.0, peopleCapacity:0, roomType:0, comment:'', photos:[], bedNumber:0, bathroomNumber:0, bedroomNumber:0, acreage:0,
    host:{ id:1, username:'', firstName:'', lastName:'', password:'', email:'', phoneNumber: '', photo: '', approved:true}, 
    description:'', has_living_room: false, has_wifi:false, has_heating:false, has_air_condition:false, has_cuisine:false, has_tv:false, has_parking:false, has_elevator:false, reservations:[]};
    this.deletePhoto = {id:0, url:'', residence: this.residence};
  }

  map!: Leaflet.Map;
  markers: Leaflet.Marker[] = [];
  options = {
    layers: [
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      })
    ],
    zoom: 10,
    center: { lat: 37.95591229014076, lng: 23.751258552074436 }
  }

  initMarker() {
    const initialMarkers = [
      {
        position: { lat: this.coordinateX, lng: this.coordinateY },
        draggable: false
      }
    ];
    for (let index = 0; index < initialMarkers.length; index++) {
      const data = initialMarkers[index];
      const marker = this.generateMarker(data, index);
      marker.addTo(this.map).bindPopup(`<b>${this.residence.address} <br>  ${this.residence.city}, ${this.residence.area}</b>`);
      this.map.panTo(data.position);
      this.markers.push(marker)
    }
  }

  generateMarker(data: any, index: number) {
    return Leaflet.marker(data.position, { draggable: data.draggable })
  }

  onMapReadyChange($event: Leaflet.Map) {
    this.map = $event;
    this.initMarker();
    var geocoder = (Leaflet.Control as any).geocoder({
      defaultMarkGeocode: true
    })
      .on('markgeocode', (e: { geocode: { center: any; }; }) => {
        var marker = e.geocode.center;
        this.coordinateX = marker.lat;
        this.coordinateY = marker.lng;
      })
      .addTo(this.map);
  }

  onMapReadyShow($event: Leaflet.Map) {
    this.map = $event;
  }

  public ngOnInit(): void {
    var temp: string;

    this.route.queryParams.subscribe((queryParam) =>{

      temp = queryParam?.['host'];
      if (temp === "true") this.ishost = true;

      temp = queryParam?.['renter'];
      if (temp === "true") this.isrenter = true;

      temp = queryParam?.['id'];
      this.id = parseInt(temp);
      this.checkIn = queryParam?.["check_in"];
      this.checkOut = queryParam?.["check_out"];

      var token = localStorage.getItem("token");
      if (token) {
        let decodedJwtData = this.jwtHelper.decodeToken(token);
        if (decodedJwtData.role === "renter") {
          this.renter_id = decodedJwtData.jti;
          this.renterService.getRenterById(this.renter_id).subscribe(
            (response: Renter) => {
              this.renter = response;
            },
            (error: HttpErrorResponse) => {
              alert(error.message);
            }
          );
        }
      }

      this.reservationService.getReservationsByResidenceIdPagination(this.id, 0).subscribe(
        (response: PageResponse) => {
          this.reservations = response.response.content;
          this.recordsNumber = response.recordCount;

          if (response.recordCount > 0) this.fromRecord = 1;
          if (response.recordCount <= 10) this.toRecord = response.recordCount;
          else this.toRecord = 10;
          
          var number = Math.floor(response.recordCount / 10);
          if (response.recordCount % 10 !== 0)  this.pages = number + 1;
          else this.pages = number;
          
          this.previousPage = -1;
          if (this.recordsNumber !== this.toRecord) this.nextPage = 1;
          else this.nextPage = -1 
        },
        (error: HttpErrorResponse) => {
          alert(error.message);
        }
      );

      this.residenceService.getResidenceById(this.id).subscribe(
        (response: Residence) => {
          this.residence = response;
          this.residence.available_from = this.residence.available_from.substring(0,10);
          this.residence.available_till = this.residence.available_till.substring(0,10);
          this.isWifiChecked = this.residence.has_wifi;
          this.isHeatingChecked = this.residence.has_heating;
          this.isAirConditionChecked = this.residence.has_air_condition;
          this.isCuisineChecked = this.residence.has_cuisine;
          this.isTvChecked = this.residence.has_tv;
          this.isParkingChecked = this.residence.has_parking;
          this.isElevatorChecked = this.residence.has_elevator;
          this.isLivingRoomChecked = this.residence.has_living_room;
          this.coordinateX = this.residence.coordinateX;
          this.coordinateY = this.residence.coordinateY;
          this.initMarker();
          if (this.residence.roomType.toString() == "PRIVATE") this.roomType = "0";
          if (this.residence.roomType.toString() == "SHARED") this.roomType = "1";
          if (this.residence.roomType.toString() == "HOUSE") this.roomType = "2";
          this.residenceService.getPhotosByResidenceId(response.id).subscribe(
            (response: Photo[]) => {
              this.photos = response;
            },
            (error: HttpErrorResponse) => {
              alert(error.message);
            }
          );
        },
        (error: HttpErrorResponse) => {
          alert(error.message);
        }
      );
    });
  }

  public addReservation(): void {
    var reservation: Reservation = {id:0, stars:0, review:'', reservationDate:'', arrivalDate:'', leaveDate:'', state:-1, renter:this.renter, residence:this.residence};
    reservation.arrivalDate = this.checkIn;
    reservation.leaveDate = this.checkOut;
    reservation.state = 0;
    reservation.reservationDate = formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.reservationService.addReservation(reservation).subscribe(
      (response: MessageResponse) => {
        console.log(response);
        const container = document.getElementById('main-container');
        const button = document.createElement('button');
        button.type = 'button';
        button.style.display = 'none';
        button.setAttribute('data-toggle', 'modal');
        if (response.message === 'ok') button.setAttribute('data-target', '#warningOkModal');
        if (response.message === 'error') button.setAttribute('data-target', '#warningErrorModal');
        container?.appendChild(button);
        button.click();
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  public createRange(number: number){
    return new Array(number);
  }

  public onChangePage(page: number) {
    this.reservationService.getReservationsByResidenceIdPagination(this.id, page).subscribe(
      (response: PageResponse) => {
        this.reservations = response.response.content;
        this.currentPage = page;

        this.fromRecord = 1;
        if (response.recordCount <= 10) this.toRecord = response.recordCount;
        else this.toRecord = 10;
        for (let index = 0; index < page; index++) {
          this.fromRecord += 10;
          this.toRecord += 10;
        }
        if (this.toRecord > response.recordCount) this.toRecord = response.recordCount;

        this.previousPage = page - 1;
        if (response.recordCount !== this.toRecord) this.nextPage = page + 1;
        else this.nextPage = -1; 
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }


  public onChangeState(state: number, reservation: Reservation) : void {
    reservation.state = state;
    this.reservationService.updateReservation(reservation).subscribe(
      (response: Reservation) => {
        console.log(response);
        this.reservationService.getReservationsByResidenceIdPagination(this.id, this.currentPage).subscribe(
          (response: PageResponse) => {
            this.reservations = response.response.content;  
          },
          (error: HttpErrorResponse) => {
            alert(error.message);
          }
        );
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  public onSelect(e: any) {
    if (e.target.files) {
      for (let i=0; i<File.length; i++) {
        this.names.push(e.target.files[i].name);
        var reader = new FileReader();
        reader.readAsDataURL(e.target.files[i]);
        reader.onload=(events:any)=>{
          this.urls.push(events.target.result);
        }
      }
    }
  }

  public onOpenModal(photo: Photo): void {
    const container = document.getElementById('main-container');
    const button = document.createElement('button');
    button.type = 'button';
    button.style.display = 'none';
    button.setAttribute('data-toggle', 'modal');
    this.deletePhoto = photo;
    button.setAttribute('data-target', '#deleteModal')
    container?.appendChild(button);
    button.click();
  }

  public onOpenModalSave(): void {
    const container = document.getElementById('main-container');
    const button = document.createElement('button');
    button.type = 'button';
    button.style.display = 'none';
    button.setAttribute('data-toggle', 'modal');
    button.setAttribute('data-target', '#saveModal')
    container?.appendChild(button);
    button.click();
  }

  public onDeletePhoto(id: number): void {
    this.photoService.deletePhoto(id).subscribe(
      (response: void) => {
        console.log(response);
        this.residenceService.getPhotosByResidenceId(this.id).subscribe(
          (response: Photo[]) => {
            this.photos = response;
          },
          (error: HttpErrorResponse) => {
            alert(error.message);
          }
        );
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

  public onEditResidence(editForm: NgForm): void {

    this.residence.available_from = editForm.value.startDate;
    this.residence.available_till = editForm.value.endDate;
    this.residence.city = editForm.value.city;
    this.residence.area = editForm.value.area;
    this.residence.address = editForm.value.address;
    this.residence.coordinateX = this.coordinateX;
    this.residence.coordinateY = this.coordinateY;
    this.residence.pricing = editForm.value.pricing;
    this.residence.floor = editForm.value.floor;
    this.residence.peopleCapacity = editForm.value.peopleCapacity;
    this.residence.bedNumber = editForm.value.bedNumber;
    this.residence.bedroomNumber = editForm.value.bedroomNumber;
    this.residence.bathroomNumber = editForm.value.bathroomNumber;
    this.residence.acreage = editForm.value.acreage;
    this.residence.comment = editForm.value.comment;
    this.residence.description = editForm.value.description;
    this.residence.roomType = editForm.value.roomType;
    this.residence.has_wifi = this.isWifiChecked
    this.residence.has_heating = this.isHeatingChecked;
    this.residence.has_air_condition = this.isAirConditionChecked;
    this.residence.has_cuisine = this.isCuisineChecked;
    this.residence.has_tv = this.isTvChecked;
    this.residence.has_parking = this.isParkingChecked;
    this.residence.has_elevator = this.isElevatorChecked;
    this.residence.has_living_room = this.isLivingRoomChecked;

    this.residenceService.updateResidence(this.residence).subscribe(
      (response: Residence) => {
        console.log(response);
        this.residence = response;
        this.residence.available_from = response.available_from.substring(0,10);
        this.residence.available_till = response.available_till.substring(0,10);
        this.onOpenModalSave();
        for (let index = 0; index < this.urls.length; index++) {
          this.photoService.addPhoto({id:0 , url: this.urls[index].toString() , residence: response}).subscribe(
            (response: Photo) => {
              console.log(response);
            },
            (error: HttpErrorResponse) => {
              alert(error.message);
            }
          );
        }
      },
      (error: HttpErrorResponse) => {
        alert(error.message);
      }
    );
  }

}
