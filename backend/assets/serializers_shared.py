from rest_framework import serializers


class ModuleScopedValidationMixin:
    module_scoped_foreign_keys = ()

    def validate(self, attrs):
        attrs = super().validate(attrs) if hasattr(super(), "validate") else attrs
        module_key = attrs.get("module", getattr(self.instance, "module", None))

        for field_name in self.module_scoped_foreign_keys:
            related_object = attrs.get(
                field_name, getattr(self.instance, field_name, None)
            )
            if related_object and module_key and related_object.module != module_key:
                raise serializers.ValidationError(
                    {
                        field_name: f"Selected {field_name.replace('_', ' ')} belongs to a different module."
                    }
                )

        return attrs
