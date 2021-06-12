$(window).on('load', function () {
	$('.preloader').fadeOut('slow');
});

$(document).ready(function () {
	$('#startTest').prop('disabled', true);
	$('#startTest').click(function () {
		$('#start').empty();
		$('#start').load('/public/views/setup.html');
		const key = window.location.href.split('/start/')[1];
		if (!key) {
			return false;
		}
		sessionStorage.setItem('key', key);
		$('#start').addClass('setup');
	});

	$('#acceptedTC').change(function () {
		if ($('#acceptedTC').is(':checked')) {
			$('#startTest').prop('disabled', false);
		} else {
			$('#startTest').prop('disabled', true);
		}
	})
});

