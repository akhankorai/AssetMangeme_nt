class ScheduleRouter:
    route_app_labels = {"assets"}

    def db_for_read(self, model, **hints):
        if model._meta.model_name in {
            "scheduletask",
            "servicetype",
            "employeecategory",
            "teammember",
        }:
            return "schedule"
        return None

    def db_for_write(self, model, **hints):
        if model._meta.model_name in {
            "scheduletask",
            "servicetype",
            "employeecategory",
            "teammember",
        }:
            return "schedule"
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if obj1._meta.model_name in {
            "scheduletask",
            "servicetype",
            "employeecategory",
            "teammember",
        } or obj2._meta.model_name in {
            "scheduletask",
            "servicetype",
            "employeecategory",
            "teammember",
        }:
            return True
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label != "assets":
            return None

        if model_name in {
            "scheduletask",
            "servicetype",
            "employeecategory",
            "teammember",
        }:
            return db == "schedule"

        return db == "default"
