'use strict'

/**
 * Basic Firebase helper
 */
export class FireBaseQuizzApp{
	constructor(){
		// Configuration of the application, You should update with your Keys !
		this.config = {
			apiKey: "AIzaSyBSecXX8V9pvCFWySKVjyjzmTshW6U-PvQ",
			authDomain: "lucca-quizz.firebaseapp.com",
			databaseURL: "https://lucca-quizz.firebaseio.com",
			storageBucket: "lucca-quizz.appspot.com",
			messagingSenderId: "1007192327952"
		}

		this.app = firebase.initializeApp(this.config);
	}


}

