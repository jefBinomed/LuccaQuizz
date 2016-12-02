'use strict'

/**
 * Class for management of question
 */
export class Question{
	constructor(title, propositions){
		this.title = title;
		this.propositions = propositions;
	}

	list(){
		return this.propositions;
	}
}