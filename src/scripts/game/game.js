'use strict';

export class Game{
	constructor({btnIndex = 'btnAnwser', btnNumbers = 3}){
		this.btns = new Array();
		for (let i = 1; i <= btnNumbers; i++){
			let btn = document.getElementById(`${btnIndex}${i}`);
			this.btns.push(btn);
			btn.addEventListener('click', this._clickAnwser.bind(this));
		}
	}

	_clickAnwser(event){
		console.info(event);
	}


}