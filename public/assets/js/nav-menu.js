var $window = $(window);
$(window).scroll(function () {
    $(document).scrollTop() > 0 ? $("header.header-fixed").addClass("header-size") : $("header.header-fixed").removeClass("header-size")
}), $(document).ready(function () {
    $window = $(window), $('section.banner[data-type="background"]').each(function () {
        var a = $(this);
        $(window).scroll(function () {
            var e = "50% " + -$window.scrollTop() / a.data("speed") + "px";
            a.css({
                backgroundPosition: e
            })
        })
    }), $(".panel-body a").click(function () {
        $(".panel-body a").removeClass("active"), $(this).addClass("active")
    }), $(".panel-group a").click(function () {
        $(".panel-group a").removeClass("active"), $(this).addClass("active")
    }), $window.scrollTop(0)
});