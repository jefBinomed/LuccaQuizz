'use strict'

/**
 * Class for management of question
 */
export class Question{
	constructor(title, propositions, help){
		this.title = title;
		this.propositions = propositions;
		this.help = help;
	}

	list(){
		return this.propositions;
	}
}