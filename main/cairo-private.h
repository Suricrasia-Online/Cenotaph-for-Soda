typedef int cairo_atomic_int_t;

struct _cairo_array {
    unsigned int size;
    unsigned int num_elements;
    unsigned int element_size;
    char *elements;
};

typedef struct _cairo_array cairo_array_t;
typedef struct _cairo_backend cairo_backend_t;
typedef struct _cairo_boxes_t cairo_boxes_t;
typedef struct _cairo_cache cairo_cache_t;
typedef struct _cairo_composite_rectangles cairo_composite_rectangles_t;
typedef struct _cairo_clip cairo_clip_t;
typedef struct _cairo_clip_path cairo_clip_path_t;
typedef struct _cairo_color cairo_color_t;
typedef struct _cairo_color_stop cairo_color_stop_t;
typedef struct _cairo_contour cairo_contour_t;
typedef struct _cairo_contour_chain cairo_contour_chain_t;
typedef struct _cairo_contour_iter cairo_contour_iter_t;
typedef struct _cairo_damage cairo_damage_t;
typedef struct _cairo_device_backend cairo_device_backend_t;
typedef struct _cairo_font_face_backend     cairo_font_face_backend_t;
typedef struct _cairo_gstate cairo_gstate_t;
typedef struct _cairo_gstate_backend cairo_gstate_backend_t;
typedef struct _cairo_glyph_text_info cairo_glyph_text_info_t;
typedef struct _cairo_hash_entry cairo_hash_entry_t;
typedef struct _cairo_hash_table cairo_hash_table_t;
typedef struct _cairo_image_surface cairo_image_surface_t;
typedef struct _cairo_mime_data cairo_mime_data_t;
typedef struct _cairo_observer cairo_observer_t;
typedef struct _cairo_output_stream cairo_output_stream_t;
typedef struct _cairo_paginated_surface_backend cairo_paginated_surface_backend_t;
typedef struct _cairo_path_fixed cairo_path_fixed_t;
typedef struct _cairo_rectangle_int16 cairo_glyph_size_t;
typedef struct _cairo_scaled_font_subsets cairo_scaled_font_subsets_t;
typedef struct _cairo_solid_pattern cairo_solid_pattern_t;
typedef struct _cairo_surface_attributes cairo_surface_attributes_t;
typedef struct _cairo_surface_backend cairo_surface_backend_t;
typedef struct _cairo_surface_observer cairo_surface_observer_t;
typedef struct _cairo_surface_snapshot cairo_surface_snapshot_t;
typedef struct _cairo_surface_subsurface cairo_surface_subsurface_t;
typedef struct _cairo_surface_wrapper cairo_surface_wrapper_t;
typedef struct _cairo_traps cairo_traps_t;
typedef struct _cairo_tristrip cairo_tristrip_t;
typedef struct _cairo_unscaled_font_backend cairo_unscaled_font_backend_t;
typedef struct _cairo_xlib_screen_info cairo_xlib_screen_info_t;

typedef cairo_array_t cairo_user_data_array_t;

typedef struct _cairo_scaled_font_private cairo_scaled_font_private_t;
typedef struct _cairo_scaled_font_backend   cairo_scaled_font_backend_t;
typedef struct _cairo_scaled_glyph cairo_scaled_glyph_t;
typedef struct _cairo_scaled_glyph_private cairo_scaled_glyph_private_t;

typedef struct cairo_compositor cairo_compositor_t;
typedef struct cairo_fallback_compositor cairo_fallback_compositor_t;
typedef struct cairo_mask_compositor cairo_mask_compositor_t;
typedef struct cairo_traps_compositor cairo_traps_compositor_t;
typedef struct cairo_spans_compositor cairo_spans_compositor_t;


typedef enum _cairo_backend_type {
    CAIRO_TYPE_DEFAULT,
    CAIRO_TYPE_SKIA,
} cairo_backend_type_t;

struct _cairo_backend {
    cairo_backend_type_t type;
    void (*destroy) (void *cr);

    cairo_surface_t *(*get_original_target) (void *cr);
    cairo_surface_t *(*get_current_target) (void *cr);

    cairo_status_t (*save) (void *cr);
    cairo_status_t (*restore) (void *cr);

    cairo_status_t (*push_group) (void *cr, cairo_content_t content);
    cairo_pattern_t *(*pop_group) (void *cr);

    cairo_status_t (*set_source_rgba) (void *cr, double red, double green, double blue, double alpha);
    cairo_status_t (*set_source_surface) (void *cr, cairo_surface_t *surface, double x, double y);
    cairo_status_t (*set_source) (void *cr, cairo_pattern_t *source);
    cairo_pattern_t *(*get_source) (void *cr);

    cairo_status_t (*set_antialias) (void *cr, cairo_antialias_t antialias);
    cairo_status_t (*set_dash) (void *cr, const double *dashes, int num_dashes, double offset);
    cairo_status_t (*set_fill_rule) (void *cr, cairo_fill_rule_t fill_rule);
    cairo_status_t (*set_line_cap) (void *cr, cairo_line_cap_t line_cap);
    cairo_status_t (*set_line_join) (void *cr, cairo_line_join_t line_join);
    cairo_status_t (*set_line_width) (void *cr, double line_width);
    cairo_status_t (*set_miter_limit) (void *cr, double limit);
    cairo_status_t (*set_opacity) (void *cr, double opacity);
    cairo_status_t (*set_operator) (void *cr, cairo_operator_t op);
    cairo_status_t (*set_tolerance) (void *cr, double tolerance);

    cairo_antialias_t (*get_antialias) (void *cr);
    void (*get_dash) (void *cr, double *dashes, int *num_dashes, double *offset);
    cairo_fill_rule_t (*get_fill_rule) (void *cr);
    cairo_line_cap_t (*get_line_cap) (void *cr);
    cairo_line_join_t (*get_line_join) (void *cr);
    double (*get_line_width) (void *cr);
    double (*get_miter_limit) (void *cr);
    double (*get_opacity) (void *cr);
    cairo_operator_t (*get_operator) (void *cr);
    double (*get_tolerance) (void *cr);

    cairo_status_t (*translate) (void *cr, double tx, double ty);
    cairo_status_t (*scale) (void *cr, double sx, double sy);
    cairo_status_t (*rotate) (void *cr, double theta);
    cairo_status_t (*transform) (void *cr, const cairo_matrix_t *matrix);
    cairo_status_t (*set_matrix) (void *cr, const cairo_matrix_t *matrix);
    cairo_status_t (*set_identity_matrix) (void *cr);
    void (*get_matrix) (void *cr, cairo_matrix_t *matrix);

    void (*user_to_device) (void *cr, double *x, double *y);
    void (*user_to_device_distance) (void *cr, double *x, double *y);
    void (*device_to_user) (void *cr, double *x, double *y);
    void (*device_to_user_distance) (void *cr, double *x, double *y);

    void (*user_to_backend) (void *cr, double *x, double *y);
    void (*user_to_backend_distance) (void *cr, double *x, double *y);
    void (*backend_to_user) (void *cr, double *x, double *y);
    void (*backend_to_user_distance) (void *cr, double *x, double *y);

    cairo_status_t (*new_path) (void *cr);
    cairo_status_t (*new_sub_path) (void *cr);
    cairo_status_t (*move_to) (void *cr, double x, double y);
    cairo_status_t (*rel_move_to) (void *cr, double dx, double dy);
    cairo_status_t (*line_to) (void *cr, double x, double y);
    cairo_status_t (*rel_line_to) (void *cr, double dx, double dy);
    cairo_status_t (*curve_to) (void *cr, double x1, double y1, double x2, double y2, double x3, double y3);
    cairo_status_t (*rel_curve_to) (void *cr, double dx1, double dy1, double dx2, double dy2, double dx3, double dy3);
    cairo_status_t (*arc_to) (void *cr, double x1, double y1, double x2, double y2, double radius);
    cairo_status_t (*rel_arc_to) (void *cr, double dx1, double dy1, double dx2, double dy2, double radius);
    cairo_status_t (*close_path) (void *cr);

    cairo_status_t (*arc) (void *cr, double xc, double yc, double radius, double angle1, double angle2, cairo_bool_t forward);
    cairo_status_t (*rectangle) (void *cr, double x, double y, double width, double height);

    void (*path_extents) (void *cr, double *x1, double *y1, double *x2, double *y2);
    cairo_bool_t (*has_current_point) (void *cr);
    cairo_bool_t (*get_current_point) (void *cr, double *x, double *y);

    cairo_path_t *(*copy_path) (void *cr);
    cairo_path_t *(*copy_path_flat) (void *cr);
    cairo_status_t (*append_path) (void *cr, const cairo_path_t *path);

    cairo_status_t (*stroke_to_path) (void *cr);

    cairo_status_t (*clip) (void *cr);
    cairo_status_t (*clip_preserve) (void *cr);
    cairo_status_t (*in_clip) (void *cr, double x, double y, cairo_bool_t *inside);
    cairo_status_t (*clip_extents) (void *cr, double *x1, double *y1, double *x2, double *y2);
    cairo_status_t (*reset_clip) (void *cr);
    cairo_rectangle_list_t *(*clip_copy_rectangle_list) (void *cr);

    cairo_status_t (*paint) (void *cr);
    cairo_status_t (*paint_with_alpha) (void *cr, double opacity);
    cairo_status_t (*mask) (void *cr, cairo_pattern_t *pattern);

    cairo_status_t (*stroke) (void *cr);
    cairo_status_t (*stroke_preserve) (void *cr);
    cairo_status_t (*in_stroke) (void *cr, double x, double y, cairo_bool_t *inside);
    cairo_status_t (*stroke_extents) (void *cr, double *x1, double *y1, double *x2, double *y2);

    cairo_status_t (*fill) (void *cr);
    cairo_status_t (*fill_preserve) (void *cr);
    cairo_status_t (*in_fill) (void *cr, double x, double y, cairo_bool_t *inside);
    cairo_status_t (*fill_extents) (void *cr, double *x1, double *y1, double *x2, double *y2);

    cairo_status_t (*set_font_face) (void *cr, cairo_font_face_t *font_face);
    cairo_font_face_t *(*get_font_face) (void *cr);
    cairo_status_t (*set_font_size) (void *cr, double size);
    cairo_status_t (*set_font_matrix) (void *cr, const cairo_matrix_t *matrix);
    void (*get_font_matrix) (void *cr, cairo_matrix_t *matrix);
    cairo_status_t (*set_font_options) (void *cr, const cairo_font_options_t *options);
    void (*get_font_options) (void *cr, cairo_font_options_t *options);
    cairo_status_t (*set_scaled_font) (void *cr, cairo_scaled_font_t *scaled_font);
    cairo_scaled_font_t *(*get_scaled_font) (void *cr);
    cairo_status_t (*font_extents) (void *cr, cairo_font_extents_t *extents);

    cairo_status_t (*glyphs) (void *cr,
			      const cairo_glyph_t *glyphs, int num_glyphs,
			      cairo_glyph_text_info_t *info);
    cairo_status_t (*glyph_path) (void *cr,
				  const cairo_glyph_t *glyphs, int num_glyphs);

    cairo_status_t (*glyph_extents) (void *cr,
				     const cairo_glyph_t *glyphs,
				     int num_glyphs,
				     cairo_text_extents_t *extents);

    cairo_status_t (*copy_page) (void *cr);
    cairo_status_t (*show_page) (void *cr);
};

typedef struct {
    cairo_atomic_int_t ref_count;
} cairo_reference_count_t;

struct _cairo {
    cairo_reference_count_t ref_count;
    cairo_status_t status;
    cairo_user_data_array_t user_data;

    const cairo_backend_t *backend;
};
