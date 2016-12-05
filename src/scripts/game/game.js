'use strict';
import {QuestionService} from '../questions/questionService.js';
import {Question} from '../questions/question.js';


export class Game{
	constructor({btnIndex = 'btnAnwser', btnNumbers = 3, isAdmin = false, firebaseApp}){
		this.btns = new Array();
		for (let i = 1; i <= btnNumbers; i++){
			let btn = document.getElementById(`${btnIndex}${i}`);
			this.btns.push(btn);
			btn.addEventListener('click', this._clickAnwser.bind(this));
		}

		this.eltTitle = document.getElementById('questionTitle');
		this.eltHelp = document.getElementById('help');
		this.questionArray = new Array();

		const questionService = new QuestionService();
		questionService.retrieveQuestions()
		.then(questionArray=>{
			this.questionArray = questionArray;
			this._fillQuestion(questionArray[0]);

		});

		if (!isAdmin){
			this.eltHelp.setAttribute('hidden', '');
		}
	}

	_clickAnwser(event){
		console.info(event);
	}

	_fillQuestion(question){
		this.eltTitle.innerHTML = question.title;
		this.eltHelp.innerHTML = question.help;
		let indexQuestion = 0;
		this.btns.forEach(btn=>{
			btn.innerHTML = question.propositions[indexQuestion];
			indexQuestion++;
		})
	}


}