var parser = window.markdownit().use(window.markdownitFootnote);
var approot = "/beacon";

var bootstrap = function() {

    app.views.navigation = Backbone.View.extend({
        //el: $("nav"),
        template: _.template($("#navigation-tmpl").html()),
        initialize: function() {
            this.navlinks = [];
        },
        events: {
            "click a": "open"
        },
        open: function(event) {
            var section = event.target.dataset.ref;
            app.main.render(section);
            event.preventDefault();
        },
        render: function() {
            var self = this;
            self.$el.html(self.template({
                navlinks: self.navlinks
            }));
        },
        append: function(text, href) {
            this.navlinks.push({
                name: text,
                href: href
            });
            this.render();
        }
    });

    app.views.main = Backbone.View.extend({
        //el: $("nav"),
        template: _.template($("#main-tmpl").html()),
        initialize: function() {

        },
        render: function(section) {
            var self = this;
            var html = "";
            var sectionHeading = app.sites.where({filename: section})[0].get("title");
            var sectionChildren = app.sites.where({parent: section});
            var promises = [];
            _.each(sectionChildren, function(c, i) {
                promises[i] = c.fetch();
            });

            var deferreds = $.when.apply($, promises);
            deferreds.done(function() {
                self.$el.html(self.template({
                    sectionHeading: sectionHeading,
                    childContent: app.sites.where({parent: section})
                }));
                app.toc.trigger("content:rendered");
            });
        }
    });

    app.views.toc = Backbone.View.extend({
        //el: $("nav"),
        template: _.template($("#toc-tmpl").html()),
        initialize: function() {
            this.on("content:rendered", this.render);
        },
        render: function() {

            // gets it in document order: thats what we want
            //var self = this;

            var allHs = _.map($("h1, h2, h3, h4, h5, h6"), function(h) {
                var $h = $(h);
                return {
                    text: $h.text(),
                    href: $h.attr("id"),
                    clss: "anchor-of-" + $h.prop("tagName"),
                    tag: $h.prop("tagName")
                }
            });

            this.$el.html(this.template({
                hs: allHs
            }));

        }
    });

    app.models.Site = Backbone.Model.extend({
        defaults: {
            hierarchy: 1,
            title: "",
            filename: "",
            parent: null,
            html: "html",
            url: ""
        },
        fetch: function() {
            var self = this;
            return $.get(this.get("url")).done(function(data) {
                self.set("html", parser.render(data));
            });
        }
    });

    app.collections.Sites = Backbone.Collection.extend({
        initialize: function() {
            var self = this;
            $.get(approot+"/structure.txt").done(function(data) {
                var lines_regex = /(.+\n)/gm;
                var name_regex = /\s>>\s/g;

                var lines = _.filter(data.split(lines_regex), function(l) {
                    return l !== "";
                });
                var parent = null;
                var hierarchy = 0;

                _.each(lines, function(l) {
                    var name_array = l.split(name_regex);
                    var filename = name_array[1].replace(/\n/, "");
                    hierarchy = (/\s*/.exec(name_array)[0].length/2) + 1;
                    if (hierarchy == 1) {
                        parent = filename;
                    }
                    self.add({
                        hierarchy: hierarchy,
                        title: name_array[0].replace(/\s*/, ""),
                        filename: filename,
                        parent: function() {
                            if (hierarchy === 1) {
                                return null;
                            } else {
                                return parent;
                            }
                        }(),
                        url: function() {
                            if (hierarchy > 1) {
                                return "sites/" + parent + "/" + filename;
                            } else if (hierarchy == 1) {
                                return "sites/" + filename;
                            }
                        }()
                    })
                });
            });
            this.on("add", function(s) {
                if (s.get("hierarchy") === 1) {
                    app.router.routes[s.get("filename")] = "changeContent";
                    app.navigation.append(s.get("title"), s.get("filename"));
                }
            })
        },
        model: app.models.Site
    });
};

var app = (function() {

    var components = {
        views: {},
        models: {},
        collections: {},
        content: null,
        router: null,
        init: function() {
            this.content = $("#main-content");
            this.sites = new components.collections.Sites();
            this.navigation = ViewsFactory.navigation();
            this.main = ViewsFactory.main();
            this.toc = ViewsFactory.toc();
            return this;
        },
        changeContent: function(el) {
            this.content.empty().append(el);
            return this;
        },
        title: function(str) {
            $("h1").text(str);
            return this;
        }
    };
    var ViewsFactory = {
        navigation: function () {
            if (!this.navigationView) {
                this.navigationView = new components.views.navigation({
                    el: $("nav")
                });
            }
            return this.navigationView;
        },
        main: function () {
            if (!this.mainView) {
                this.mainView = new components.views.main({
                    el: $("#main-content")
                });
            }
            return this.mainView;
        },
        toc: function () {
            if (!this.tocView) {
                this.tocView = new components.views.toc({
                    el: $("#toc")
                });
            }
            return this.tocView;
        }
    };
    var Router = Backbone.Router.extend({
        routes: {
        },
        changeContent: function() {
            console.log("routed");
            $("#main-content").text("CHANGE");
        }
    });
    components.router = new Router();

    Backbone.history.start(
        {
            //pushState: true,
            //root: approot
        }
    );

    return components;

})();

$(function() {
    bootstrap();
    app.init();

    //$(document).on("click", "a[href]:not([data-bypass])", function(evt) {
    //    var href = $(this).attr("href");
    //    if (!/\w+\.\w+/.test(href)) {
    //        evt.preventDefault();
    //        Backbone.history.navigate(href, {});
    //    }
    //});
});