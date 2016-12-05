'use strict';
import {QuestionService} from '../questions/questionService.js';
import {Question} from '../questions/question.js';
const appVersion = 1;

class ModelGame{
	constructor(){
		this.indexQuestion = 0;
		this.currentAnswer = -1;
		this.isAdmin = false;
		this.score = 0; 
	}
}

export class Game{
	constructor({btnIndex = 'btnAnwser', btnNumbers = 3, isAdmin = false, firebaseApp, firebaseAuth}){
		// Manage html
		this.regex = new RegExp(btnIndex+'([0-9])');
		this.btns = new Array();
		for (let i = 1; i <= btnNumbers; i++){
			let btn = document.getElementById(`${btnIndex}${i}`);
			this.btns.push(btn);
			btn.addEventListener('click', this._clickAnwser.bind(this));
		}
		// Manage html elements
		this.eltTitle = document.getElementById('questionTitle');
		this.eltHelp = document.getElementById('help');

		// Add btns
		this.btnConfirm = document.getElementById('confirmBtn');
		this.btnNext = document.getElementById('btnRight');
		this.btnPrev = document.getElementById('btnLeft');

		// Model
		this.model = new ModelGame();
		this.model.isAdmin = isAdmin;

		this.questionArray = new Array();

		// FireBase 
		this.firebaseApp = firebaseApp;
		this.firebaseAuth = firebaseAuth;

		this._initGame();
	}

	_initGame(){
		// Start the service 
		const questionService = new QuestionService();
		questionService.retrieveQuestions()
		.then(questionArray=>{
			this.questionArray = questionArray;
			this._fillQuestion(questionArray[0]);

		});

		// Manage visibility
		this.btnConfirm.setAttribute('hidden', '');
		if (!this.model.isAdmin){
			this.eltHelp.setAttribute('hidden', '');
			this.btnNext.setAttribute('hidden', '');
			this.btnPrev.setAttribute('hidden', '');
		}else{
			// Add interactivity
			const streamLeft = Rx.Observable.fromEvent(this.btnPrev, 'click')
				.map(() => 'prev');
			
			const streamRight = Rx.Observable.fromEvent(this.btnNext, 'click')
				.map(() => 'next');
			
			const streamConfirm = Rx.Observable.fromEvent(this.btnConfirm, 'click')
				.map(() => 'confirm');

			streamLeft.merge(streamRight)
				.merge(streamConfirm)
				.subscribe((state) => {
					let tempAnswer = -1;
					if (state === 'prev'){
						this.model.indexQuestion = Math.max(0, this.model.indexQuestion - 1);						
					}else if (state === 'next'){
						this.model.indexQuestion = Math.min(this.questionArray.length, this.model.indexQuestion + 1);						
					}else if (state === 'confirm'){
						tempAnswer = this.model.currentAnswer;
					}
					this.firebaseApp.database().ref('currentQuestion').set({
						indexQuestion : this.model.indexQuestion,
						anwser : tempAnswer,
						appVersion : appVersion
					});
				});
		}

		this.firebaseApp.database().ref('currentQuestion').on('value', this._updateData.bind(this));
	}

	_updateData(snapshot){
		if (this.questionArray.length === 0){
			return;
		}
		if (snapshot.val()){
			this._resetBtns();
			const valueQuestion = snapshot.val();
			this._fillQuestion(this.questionArray[valueQuestion.indexQuestion]);
			this.model.indexQuestion = valueQuestion.indexQuestion;
			if (valueQuestion.anwser != -1){
				// TODO gestion des points
			}
		}else if (this.model.isAdmin){			
			this.firebaseApp.database().ref('currentQuestion').set({
				indexQuestion : 0,
				anwser : -1,
				appVersion : appVersion
			});
		}
	}

	_resetBtns(){
		this.btns.forEach(btn=>{
			btn.classList.remove('mdl-button--colored');
			btn.classList.add('mdl-button--accent');
		})
	}

	_clickAnwser(event){
		this._resetBtns();
		event.target.classList.remove('mdl-button--accent');
		event.target.classList.add('mdl-button--colored');
		const results = this.regex.exec(event.target.id);
		this.model.currentAnswer = (results.length > 0) ? +results[1] : -1;
				
		if (this.model.isAdmin){
			this.btnConfirm.removeAttribute('hidden');
		}else if (this.model.currentAnswer != -1){ 
			this.firebaseApp.database().ref(`anwsers/question${this.model.indexQuestion}/${this.firebaseAuth.userId()}`)
				.set({
					timestamp : Date.now(),
					anwser : this.model.currentAnswer,
					user : {
						name : this.firebaseAuth.displayName(),
						id : this.firebaseAuth.userId()
					}
				});
		}
	}

	_fillQuestion(question){
		this.btnConfirm.setAttribute('hidden', '');
		this.eltTitle.innerHTML = question.title;
		this.eltHelp.innerHTML = question.help;
		let indexAnswer = 0;
		this.btns.forEach(btn=>{
			btn.innerHTML = question.propositions[indexAnswer];
			indexAnswer++;
		})
	}


}