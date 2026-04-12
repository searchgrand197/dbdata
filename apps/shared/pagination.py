from rest_framework.pagination import LimitOffsetPagination


class StandardLimitOffsetPagination(LimitOffsetPagination):
    """
    Market-friendly pagination with stable JSON shape.
    """

    default_limit = 20
    max_limit = 500
