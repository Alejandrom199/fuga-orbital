CREATE TABLE "inventario" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"cantidad" integer DEFAULT 0 NOT NULL,
	"equipado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"tipo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text NOT NULL,
	"icono" text NOT NULL,
	"costo" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "items_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "items_tipo_check" CHECK ("items"."tipo" in ('mejora','cosmetico'))
);
--> statement-breakpoint
CREATE TABLE "logros" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text NOT NULL,
	"icono" text NOT NULL,
	"condicion" jsonb NOT NULL,
	"recompensa" integer DEFAULT 0 NOT NULL,
	"secreto" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "logros_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "logros_usuario" (
	"usuario_id" integer NOT NULL,
	"logro_id" integer NOT NULL,
	"desbloqueado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logros_usuario_usuario_id_logro_id_pk" PRIMARY KEY("usuario_id","logro_id")
);
--> statement-breakpoint
CREATE TABLE "niveles" (
	"id" serial PRIMARY KEY NOT NULL,
	"orden" integer NOT NULL,
	"nombre" text NOT NULL,
	"config" jsonb NOT NULL,
	"objetivo" jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "niveles_orden_unique" UNIQUE("orden")
);
--> statement-breakpoint
CREATE TABLE "partidas" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"modo" text NOT NULL,
	"nivel_id" integer,
	"puntos" integer NOT NULL,
	"monedas_ganadas" integer DEFAULT 0 NOT NULL,
	"duracion_s" integer NOT NULL,
	"mejoras_usadas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partidas_modo_check" CHECK ("partidas"."modo" in ('endless','nivel'))
);
--> statement-breakpoint
CREATE TABLE "perfiles" (
	"usuario_id" integer PRIMARY KEY NOT NULL,
	"monedas" integer DEFAULT 0 NOT NULL,
	"ajustes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progreso_niveles" (
	"usuario_id" integer NOT NULL,
	"nivel_id" integer NOT NULL,
	"completado" boolean DEFAULT false NOT NULL,
	"estrellas" integer DEFAULT 0 NOT NULL,
	"mejor_puntuacion" integer DEFAULT 0 NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "progreso_niveles_usuario_id_nivel_id_pk" PRIMARY KEY("usuario_id","nivel_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"password_hash" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logros_usuario" ADD CONSTRAINT "logros_usuario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logros_usuario" ADD CONSTRAINT "logros_usuario_logro_id_logros_id_fk" FOREIGN KEY ("logro_id") REFERENCES "public"."logros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_nivel_id_niveles_id_fk" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfiles" ADD CONSTRAINT "perfiles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progreso_niveles" ADD CONSTRAINT "progreso_niveles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progreso_niveles" ADD CONSTRAINT "progreso_niveles_nivel_id_niveles_id_fk" FOREIGN KEY ("nivel_id") REFERENCES "public"."niveles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventario_usuario_item_unique" ON "inventario" USING btree ("usuario_id","item_id");--> statement-breakpoint
CREATE INDEX "partidas_puntos_idx" ON "partidas" USING btree ("puntos" DESC NULLS LAST);