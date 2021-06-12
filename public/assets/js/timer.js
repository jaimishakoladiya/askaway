var start;
var callback = null;

let sec = 0;
let min = 5;	

var running = true;
countTime();

//Method to update new time
function updateNewTime(mins, secs, callbackFunc) {
	min = mins;
	sec = secs;
	callback = callbackFunc;

	if (!running) {
		running = true;
		countTime();
	}
}

function addThirthMoreSeconds() {
	sec += 30;
	if (sec > 59) {
		min++;
		sec = sec - 60;
	}
}

function stopClock() {

	running = false;
}

function countTime() {
	setTimeout(function () {
		if (min == 0 && sec == 0) {
			stopClock();
			callback();
			return;
		}
		else if (min > 0 && sec == 0) {
			sec = 59;
			min--;
		} else {
			sec--;
		}
		showTime();
		if (running) {
			countTime();
		}

	}, 1000);
}

function showTime() {
	/* makeOne(sec, '#sec .ones');
	makeOne(min, '#min .ones'); */
	//makeOne(hr,'#hr .ones');

	/* makeTen(sec, '#sec .tens');
	makeTen(min, '#min .tens'); */
	//makeTen(hr,'#hr .tens');

	$('#time_left').html(min + ':' + sec)

}

// function makeOne(time, type) {
// 	var one = time % 10;
// 	makeNumber(one, type);
// }
// function makeTen(time, type) {
// 	var ten = Math.floor(time / 10);
// 	makeOne(ten, type);
// }
// function makeNumber(num, type) {

// 	switch (num) {

// 		case 0:
// 			$(type).show();
// 			$(type + '.b7').hide();
// 			break;

// 		case 1:
// 			$(type).hide();
// 			$(type + '.b5,' + type + '.b6').show();
// 			break;

// 		case 2:
// 			$(type).show();
// 			$(type + '.b2,' + type + '.b5').hide();
// 			break;

// 		case 3:
// 			$(type).show();
// 			$(type + '.b2,' + type + '.b3').hide();
// 			break;

// 		case 4:
// 			$(type).show();
// 			$(type + '.b1,' + type + '.b3,' + type + '.b4').hide();
// 			break;

// 		case 5:
// 			$(type).show();
// 			$(type + '.b3,' + type + '.b6').hide();
// 			break;

// 		case 6:
// 			$(type).show();
// 			$(type + '.b6').hide();
// 			break;

// 		case 7: 
// 			$(type).hide();
// 			$(type + '.b1,' + type + '.b5,' + type + '.b6').show();
// 			break;

// 		case 8:
// 			$(type).show();
// 			break;

// 		case 9:
// 			$(type).show();
// 			$(type + '.b3').hide();
// 			break;
// 	}


// }
