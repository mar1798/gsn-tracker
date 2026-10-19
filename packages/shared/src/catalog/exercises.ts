import type { MuscleSlug } from './muscles.js';

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'ez_bar',
  'trap_bar',
  'cable',
  'machine',
  'smith',
  'bodyweight',
  'band',
  'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const MECHANICS = ['compound', 'isolation'] as const;
export type Mechanics = (typeof MECHANICS)[number];

export type MuscleRole = 'primary' | 'secondary';

export interface ExerciseMuscleDef {
  muscle: MuscleSlug;
  role: MuscleRole;
  /** Share of the set counted for this muscle: primary 1.0, secondary 0.3–0.5. */
  coefficient: number;
}

/** FIT `exercise_category` + `<category>ExerciseName` value. `exerciseName: null` = whole category. */
export interface GarminMapping {
  category: string;
  exerciseName: string | null;
}

export interface ExerciseDef {
  /** Stable id of a built-in exercise; seeds are upserted by it. */
  slug: string;
  nameRu: string;
  nameEn: string;
  equipment: Equipment;
  mechanics: Mechanics;
  isBodyweight: boolean;
  garmin: GarminMapping | null;
  muscles: ExerciseMuscleDef[];
}

type Secondary = Partial<Record<MuscleSlug, number>>;

function ex(
  slug: string,
  nameRu: string,
  nameEn: string,
  equipment: Equipment,
  mechanics: Mechanics,
  primary: MuscleSlug[],
  secondary: Secondary,
  /** `category` or `category/exerciseName`, names exactly as in the FIT profile. */
  garmin: string | null,
): ExerciseDef {
  const [category, exerciseName] = garmin?.split('/') ?? [];
  return {
    slug,
    nameRu,
    nameEn,
    equipment,
    mechanics,
    isBodyweight: equipment === 'bodyweight',
    garmin: category ? { category, exerciseName: exerciseName ?? null } : null,
    muscles: [
      ...primary.map((muscle) => ({ muscle, role: 'primary' as const, coefficient: 1 })),
      ...Object.entries(secondary).map(([muscle, coefficient]) => ({
        muscle: muscle as MuscleSlug,
        role: 'secondary' as const,
        coefficient,
      })),
    ],
  };
}

const PRESS: Secondary = { front_delts: 0.5, triceps: 0.5 };
const ROW: Secondary = { traps: 0.5, rear_delts: 0.5, biceps: 0.5, lower_back: 0.3 };
const PULLDOWN: Secondary = { biceps: 0.5, rear_delts: 0.3, forearms: 0.3 };
const OVERHEAD: Secondary = { side_delts: 0.5, triceps: 0.5, traps: 0.3 };
const SQUAT: Secondary = { adductors: 0.5, hamstrings: 0.3, lower_back: 0.3 };
const LUNGE: Secondary = { adductors: 0.3, hamstrings: 0.3 };

// prettier-ignore
export const EXERCISES: readonly ExerciseDef[] = [
  // Chest
  ex('barbell_bench_press', 'Жим штанги лёжа', 'Barbell bench press', 'barbell', 'compound', ['chest'], PRESS, 'benchPress/barbellBenchPress'),
  ex('incline_barbell_bench_press', 'Жим штанги лёжа на наклонной скамье', 'Incline barbell bench press', 'barbell', 'compound', ['chest'], { front_delts: 0.5, triceps: 0.4 }, 'benchPress/inclineBarbellBenchPress'),
  ex('close_grip_bench_press', 'Жим штанги узким хватом', 'Close-grip bench press', 'barbell', 'compound', ['triceps'], { chest: 0.5, front_delts: 0.3 }, 'benchPress/closeGripBarbellBenchPress'),
  ex('dumbbell_bench_press', 'Жим гантелей лёжа', 'Dumbbell bench press', 'dumbbell', 'compound', ['chest'], PRESS, 'benchPress/dumbbellBenchPress'),
  ex('incline_dumbbell_bench_press', 'Жим гантелей на наклонной скамье', 'Incline dumbbell bench press', 'dumbbell', 'compound', ['chest'], { front_delts: 0.5, triceps: 0.4 }, 'benchPress/inclineDumbbellBenchPress'),
  ex('decline_dumbbell_bench_press', 'Жим гантелей головой вниз', 'Decline dumbbell bench press', 'dumbbell', 'compound', ['chest'], { triceps: 0.5, front_delts: 0.3 }, 'benchPress/declineDumbbellBenchPress'),
  ex('smith_bench_press', 'Жим лёжа в Смите', 'Smith machine bench press', 'smith', 'compound', ['chest'], PRESS, 'benchPress/smithMachineBenchPress'),
  ex('machine_chest_press', 'Жим от груди в тренажёре', 'Machine chest press', 'machine', 'compound', ['chest'], PRESS, 'benchPress'),
  ex('dumbbell_flye', 'Разводка гантелей лёжа', 'Dumbbell flye', 'dumbbell', 'isolation', ['chest'], { front_delts: 0.3 }, 'flye/dumbbellFlye'),
  ex('incline_dumbbell_flye', 'Разводка гантелей на наклонной скамье', 'Incline dumbbell flye', 'dumbbell', 'isolation', ['chest'], { front_delts: 0.3 }, 'flye/inclineDumbbellFlye'),
  ex('cable_crossover', 'Сведение рук в кроссовере', 'Cable crossover', 'cable', 'isolation', ['chest'], { front_delts: 0.3 }, 'flye/cableCrossover'),
  ex('pec_deck', 'Сведение рук в тренажёре (бабочка)', 'Pec deck', 'machine', 'isolation', ['chest'], { front_delts: 0.3 }, 'flye'),
  ex('dumbbell_pullover', 'Пуловер с гантелью', 'Dumbbell pullover', 'dumbbell', 'compound', ['chest'], { lats: 0.5, triceps: 0.3 }, null),
  ex('push_up', 'Отжимания от пола', 'Push-up', 'bodyweight', 'compound', ['chest'], { triceps: 0.5, front_delts: 0.5, abs: 0.3 }, 'pushUp/pushUp'),
  ex('dips', 'Отжимания на брусьях', 'Dips', 'bodyweight', 'compound', ['chest', 'triceps'], { front_delts: 0.4 }, 'tricepsExtension/bodyWeightDip'),

  // Back
  ex('pull_up', 'Подтягивания', 'Pull-up', 'bodyweight', 'compound', ['lats'], PULLDOWN, 'pullUp/pullUp'),
  ex('chin_up', 'Подтягивания обратным хватом', 'Chin-up', 'bodyweight', 'compound', ['lats'], { biceps: 0.5, rear_delts: 0.3, forearms: 0.3 }, 'pullUp/chinUp'),
  ex('neutral_grip_pull_up', 'Подтягивания параллельным хватом', 'Neutral-grip pull-up', 'bodyweight', 'compound', ['lats'], PULLDOWN, 'pullUp/neutralGripPullUp'),
  ex('lat_pulldown', 'Тяга верхнего блока к груди', 'Lat pulldown', 'cable', 'compound', ['lats'], PULLDOWN, 'pullUp/latPulldown'),
  ex('close_grip_lat_pulldown', 'Тяга верхнего блока узким хватом', 'Close-grip lat pulldown', 'cable', 'compound', ['lats'], PULLDOWN, 'pullUp/closeGripLatPulldown'),
  ex('straight_arm_pulldown', 'Пуловер на верхнем блоке', 'Straight-arm pulldown', 'cable', 'isolation', ['lats'], { triceps: 0.3 }, 'pullUp/straightArmPulldown'),
  ex('barbell_row', 'Тяга штанги в наклоне', 'Barbell row', 'barbell', 'compound', ['lats'], ROW, 'row/barbellRow'),
  ex('dumbbell_row', 'Тяга гантели одной рукой в наклоне', 'One-arm dumbbell row', 'dumbbell', 'compound', ['lats'], { rear_delts: 0.5, biceps: 0.5, traps: 0.3 }, 'row/dumbbellRow'),
  ex('seated_cable_row', 'Тяга горизонтального блока', 'Seated cable row', 'cable', 'compound', ['lats'], { traps: 0.5, rear_delts: 0.5, biceps: 0.5 }, 'row/seatedCableRow'),
  ex('t_bar_row', 'Тяга Т-грифа', 'T-bar row', 'barbell', 'compound', ['lats'], ROW, 'row/tBarRow'),
  ex('chest_supported_dumbbell_row', 'Тяга гантелей лёжа на наклонной скамье', 'Chest-supported dumbbell row', 'dumbbell', 'compound', ['lats'], { traps: 0.5, rear_delts: 0.5, biceps: 0.5 }, 'row/chestSupportedDumbbellRow'),
  ex('machine_row', 'Тяга в рычажном тренажёре', 'Machine row', 'machine', 'compound', ['lats'], { traps: 0.5, rear_delts: 0.5, biceps: 0.5 }, 'row'),
  ex('inverted_row', 'Австралийские подтягивания', 'Inverted row', 'bodyweight', 'compound', ['lats'], { traps: 0.5, rear_delts: 0.5, biceps: 0.5 }, 'row/invertedRow'),
  ex('face_pull', 'Тяга каната к лицу', 'Face pull', 'cable', 'isolation', ['rear_delts'], { traps: 0.5, side_delts: 0.3 }, 'row/facePull'),
  ex('deadlift', 'Становая тяга', 'Deadlift', 'barbell', 'compound', ['glutes', 'hamstrings', 'lower_back'], { quads: 0.5, traps: 0.5, lats: 0.3, forearms: 0.4 }, 'deadlift/barbellDeadlift'),
  ex('sumo_deadlift', 'Становая тяга сумо', 'Sumo deadlift', 'barbell', 'compound', ['glutes', 'adductors'], { quads: 0.5, hamstrings: 0.5, lower_back: 0.5, traps: 0.3 }, 'deadlift/sumoDeadlift'),
  ex('romanian_deadlift', 'Румынская тяга', 'Romanian deadlift', 'barbell', 'compound', ['hamstrings', 'glutes'], { lower_back: 0.5, forearms: 0.3 }, 'deadlift/romanianDeadlift'),
  ex('dumbbell_romanian_deadlift', 'Румынская тяга с гантелями', 'Dumbbell Romanian deadlift', 'dumbbell', 'compound', ['hamstrings', 'glutes'], { lower_back: 0.5, forearms: 0.3 }, 'deadlift/dumbbellStraightLegDeadlift'),
  ex('trap_bar_deadlift', 'Становая тяга с трэп-грифом', 'Trap bar deadlift', 'trap_bar', 'compound', ['glutes', 'quads'], { hamstrings: 0.5, lower_back: 0.5, traps: 0.5, forearms: 0.3 }, 'deadlift/trapBarDeadlift'),
  ex('rack_pull', 'Тяга с плинтов', 'Rack pull', 'barbell', 'compound', ['lower_back', 'traps'], { glutes: 0.5, hamstrings: 0.3, lats: 0.3, forearms: 0.4 }, 'deadlift/rackPull'),
  ex('back_extension', 'Гиперэкстензия', 'Back extension', 'bodyweight', 'isolation', ['lower_back'], { glutes: 0.5, hamstrings: 0.5 }, 'hyperextension'),
  ex('good_morning', 'Наклоны со штангой (гуд морнинг)', 'Good morning', 'barbell', 'compound', ['hamstrings', 'lower_back'], { glutes: 0.5 }, 'legCurl/goodMorning'),
  ex('barbell_shrug', 'Шраги со штангой', 'Barbell shrug', 'barbell', 'isolation', ['traps'], { forearms: 0.3 }, 'shrug/barbellShrug'),
  ex('dumbbell_shrug', 'Шраги с гантелями', 'Dumbbell shrug', 'dumbbell', 'isolation', ['traps'], { forearms: 0.3 }, 'shrug/dumbbellShrug'),

  // Shoulders
  ex('overhead_press', 'Жим штанги стоя (армейский)', 'Overhead press', 'barbell', 'compound', ['front_delts'], OVERHEAD, 'shoulderPress/overheadBarbellPress'),
  ex('seated_barbell_press', 'Жим штанги сидя', 'Seated barbell press', 'barbell', 'compound', ['front_delts'], OVERHEAD, 'shoulderPress/seatedBarbellShoulderPress'),
  ex('seated_dumbbell_press', 'Жим гантелей сидя', 'Seated dumbbell press', 'dumbbell', 'compound', ['front_delts'], OVERHEAD, 'shoulderPress/seatedDumbbellShoulderPress'),
  ex('arnold_press', 'Жим Арнольда', 'Arnold press', 'dumbbell', 'compound', ['front_delts'], OVERHEAD, 'shoulderPress/arnoldPress'),
  ex('smith_overhead_press', 'Жим сидя в Смите', 'Smith machine overhead press', 'smith', 'compound', ['front_delts'], OVERHEAD, 'shoulderPress/smithMachineOverheadPress'),
  ex('machine_shoulder_press', 'Жим вверх в тренажёре', 'Machine shoulder press', 'machine', 'compound', ['front_delts'], OVERHEAD, 'shoulderPress'),
  ex('push_press', 'Жимовой швунг', 'Push press', 'barbell', 'compound', ['front_delts'], { side_delts: 0.4, triceps: 0.5, quads: 0.3 }, 'shoulderPress/barbellPushPress'),
  ex('dumbbell_lateral_raise', 'Махи гантелями в стороны', 'Dumbbell lateral raise', 'dumbbell', 'isolation', ['side_delts'], { traps: 0.3 }, 'lateralRaise/dumbbellLateralRaise'),
  ex('cable_lateral_raise', 'Отведение руки в сторону на нижнем блоке', 'Cable lateral raise', 'cable', 'isolation', ['side_delts'], { traps: 0.3 }, 'lateralRaise/oneArmCableLateralRaise'),
  ex('machine_lateral_raise', 'Махи в стороны в тренажёре', 'Machine lateral raise', 'machine', 'isolation', ['side_delts'], { traps: 0.3 }, 'lateralRaise'),
  ex('front_raise', 'Подъём гантелей перед собой', 'Front raise', 'dumbbell', 'isolation', ['front_delts'], { side_delts: 0.3 }, 'lateralRaise/frontRaise'),
  ex('rear_delt_raise', 'Махи гантелями в наклоне', 'Bent-over rear delt raise', 'dumbbell', 'isolation', ['rear_delts'], { traps: 0.3 }, 'lateralRaise/bentOverLateralRaise'),
  ex('seated_rear_delt_raise', 'Махи гантелями в наклоне сидя', 'Seated rear lateral raise', 'dumbbell', 'isolation', ['rear_delts'], { traps: 0.3 }, 'lateralRaise/seatedRearLateralRaise'),
  ex('reverse_pec_deck', 'Обратная бабочка', 'Reverse pec deck', 'machine', 'isolation', ['rear_delts'], { traps: 0.3 }, 'flye'),
  ex('upright_row', 'Тяга штанги к подбородку', 'Upright row', 'barbell', 'compound', ['side_delts', 'traps'], { front_delts: 0.3, biceps: 0.3 }, 'shrug/barbellUprightRow'),

  // Arms
  ex('barbell_curl', 'Подъём штанги на бицепс', 'Barbell curl', 'barbell', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/barbellBicepsCurl'),
  ex('ez_bar_curl', 'Подъём EZ-штанги на бицепс', 'EZ-bar curl', 'ez_bar', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/standingEzBarBicepsCurl'),
  ex('dumbbell_curl', 'Подъём гантелей на бицепс', 'Dumbbell curl', 'dumbbell', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/dumbbellBicepsCurl'),
  ex('hammer_curl', 'Молотковые сгибания', 'Hammer curl', 'dumbbell', 'isolation', ['biceps'], { forearms: 0.5 }, 'curl/dumbbellHammerCurl'),
  ex('incline_dumbbell_curl', 'Сгибания с гантелями на наклонной скамье', 'Incline dumbbell curl', 'dumbbell', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/inclineDumbbellBicepsCurl'),
  ex('preacher_curl', 'Сгибания на скамье Скотта', 'Preacher curl', 'ez_bar', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/ezBarPreacherCurl'),
  ex('cable_curl', 'Сгибания рук на нижнем блоке', 'Cable curl', 'cable', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/cableBicepsCurl'),
  ex('concentration_curl', 'Концентрированные сгибания', 'Concentration curl', 'dumbbell', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl/oneArmConcentrationCurl'),
  ex('machine_curl', 'Сгибания рук в тренажёре', 'Machine curl', 'machine', 'isolation', ['biceps'], { forearms: 0.3 }, 'curl'),
  ex('reverse_curl', 'Сгибания рук обратным хватом', 'Reverse curl', 'ez_bar', 'isolation', ['forearms'], { biceps: 0.5 }, 'curl/reverseEzBarCurl'),
  ex('wrist_curl', 'Сгибания запястий со штангой', 'Wrist curl', 'barbell', 'isolation', ['forearms'], {}, 'curl/barbellWristCurl'),
  ex('triceps_pushdown', 'Разгибания рук на верхнем блоке', 'Triceps pushdown', 'cable', 'isolation', ['triceps'], {}, 'tricepsExtension/tricepsPressdown'),
  ex('rope_pushdown', 'Разгибания рук с канатом на блоке', 'Rope pushdown', 'cable', 'isolation', ['triceps'], {}, 'tricepsExtension/ropePressdown'),
  ex('skull_crusher', 'Французский жим лёжа', 'Skull crusher', 'ez_bar', 'isolation', ['triceps'], {}, 'tricepsExtension/lyingEzBarTricepsExtension'),
  ex('overhead_dumbbell_extension', 'Французский жим гантели сидя', 'Seated overhead dumbbell extension', 'dumbbell', 'isolation', ['triceps'], {}, 'tricepsExtension/seatedDumbbellOverheadTricepsExtension'),
  ex('cable_overhead_extension', 'Разгибания рук из-за головы на блоке', 'Cable overhead triceps extension', 'cable', 'isolation', ['triceps'], {}, 'tricepsExtension/cableOverheadTricepsExtension'),
  ex('dumbbell_kickback', 'Разгибание руки с гантелью в наклоне', 'Dumbbell kickback', 'dumbbell', 'isolation', ['triceps'], {}, 'tricepsExtension/dumbbellKickback'),
  ex('bench_dip', 'Обратные отжимания от скамьи', 'Bench dip', 'bodyweight', 'compound', ['triceps'], { chest: 0.3, front_delts: 0.3 }, 'tricepsExtension/benchDip'),
  ex('diamond_push_up', 'Отжимания узким упором', 'Diamond push-up', 'bodyweight', 'compound', ['triceps'], { chest: 0.5, front_delts: 0.3 }, 'pushUp/diamondPushUp'),

  // Legs
  ex('back_squat', 'Приседания со штангой', 'Back squat', 'barbell', 'compound', ['quads', 'glutes'], SQUAT, 'squat/barbellBackSquat'),
  ex('front_squat', 'Фронтальные приседания', 'Front squat', 'barbell', 'compound', ['quads'], { glutes: 0.5, abs: 0.3, lower_back: 0.3 }, 'squat/barbellFrontSquat'),
  ex('box_squat', 'Приседания на ящик', 'Box squat', 'barbell', 'compound', ['quads', 'glutes'], SQUAT, 'squat/barbellBoxSquat'),
  ex('goblet_squat', 'Гоблет-присед', 'Goblet squat', 'dumbbell', 'compound', ['quads', 'glutes'], { adductors: 0.3, abs: 0.3 }, 'squat/gobletSquat'),
  ex('smith_squat', 'Приседания в Смите', 'Smith machine squat', 'smith', 'compound', ['quads', 'glutes'], { adductors: 0.3, hamstrings: 0.3 }, 'squat'),
  ex('hack_squat', 'Гакк-приседания в тренажёре', 'Machine hack squat', 'machine', 'compound', ['quads'], { glutes: 0.5, adductors: 0.3 }, 'squat'),
  ex('leg_press', 'Жим ногами', 'Leg press', 'machine', 'compound', ['quads', 'glutes'], { adductors: 0.3, hamstrings: 0.3 }, 'squat/legPress'),
  ex('air_squat', 'Приседания без веса', 'Air squat', 'bodyweight', 'compound', ['quads', 'glutes'], { adductors: 0.3 }, 'squat/airSquat'),
  ex('bulgarian_split_squat', 'Болгарские выпады', 'Bulgarian split squat', 'dumbbell', 'compound', ['quads', 'glutes'], LUNGE, 'lunge/dumbbellBulgarianSplitSquat'),
  ex('barbell_lunge', 'Выпады со штангой', 'Barbell lunge', 'barbell', 'compound', ['quads', 'glutes'], LUNGE, 'lunge/barbellLunge'),
  ex('dumbbell_lunge', 'Выпады с гантелями', 'Dumbbell lunge', 'dumbbell', 'compound', ['quads', 'glutes'], LUNGE, 'lunge/dumbbellLunge'),
  ex('walking_lunge', 'Выпады в ходьбе', 'Walking lunge', 'dumbbell', 'compound', ['quads', 'glutes'], LUNGE, 'lunge/walkingDumbbellLunge'),
  ex('reverse_lunge', 'Обратные выпады', 'Reverse lunge', 'dumbbell', 'compound', ['glutes', 'quads'], LUNGE, 'lunge/dumbbellReverseLunge'),
  ex('step_up', 'Зашагивания на тумбу', 'Step-up', 'dumbbell', 'compound', ['quads', 'glutes'], { hamstrings: 0.3 }, 'squat/dumbbellStepUp'),
  ex('leg_extension', 'Разгибания ног в тренажёре', 'Leg extension', 'machine', 'isolation', ['quads'], {}, null),
  ex('lying_leg_curl', 'Сгибания ног лёжа', 'Lying leg curl', 'machine', 'isolation', ['hamstrings'], { calves: 0.3 }, 'legCurl/legCurl'),
  ex('seated_leg_curl', 'Сгибания ног сидя', 'Seated leg curl', 'machine', 'isolation', ['hamstrings'], {}, 'legCurl/legCurl'),
  ex('hip_thrust', 'Ягодичный мост со штангой', 'Barbell hip thrust', 'barbell', 'compound', ['glutes'], { hamstrings: 0.5, quads: 0.3 }, 'hipRaise/barbellHipThrustWithBench'),
  ex('glute_bridge', 'Ягодичный мост', 'Glute bridge', 'bodyweight', 'isolation', ['glutes'], { hamstrings: 0.5 }, 'hipRaise/hipRaise'),
  ex('kettlebell_swing', 'Махи гирей', 'Kettlebell swing', 'kettlebell', 'compound', ['glutes', 'hamstrings'], { lower_back: 0.5, front_delts: 0.3, abs: 0.3 }, 'hipRaise/kettlebellSwing'),
  ex('cable_glute_kickback', 'Отведение ноги назад на блоке', 'Cable glute kickback', 'cable', 'isolation', ['glutes'], { hamstrings: 0.3 }, null),
  ex('hip_adduction_machine', 'Сведение ног в тренажёре', 'Hip adduction machine', 'machine', 'isolation', ['adductors'], {}, null),
  ex('hip_abduction_machine', 'Разведение ног в тренажёре', 'Hip abduction machine', 'machine', 'isolation', ['glutes'], {}, null),
  ex('standing_calf_raise', 'Подъём на носки стоя', 'Standing calf raise', 'machine', 'isolation', ['calves'], {}, 'calfRaise/standingCalfRaise'),
  ex('seated_calf_raise', 'Подъём на носки сидя', 'Seated calf raise', 'machine', 'isolation', ['calves'], {}, 'calfRaise/seatedCalfRaise'),
  ex('dumbbell_calf_raise', 'Подъём на носки с гантелями', 'Dumbbell calf raise', 'dumbbell', 'isolation', ['calves'], {}, 'calfRaise/standingDumbbellCalfRaise'),
  ex('leg_press_calf_raise', 'Икры в тренажёре для жима ногами', 'Leg press calf raise', 'machine', 'isolation', ['calves'], {}, 'calfRaise'),

  // Core
  ex('crunch', 'Скручивания', 'Crunch', 'bodyweight', 'isolation', ['abs'], {}, 'crunch/crunch'),
  ex('cable_crunch', 'Скручивания на блоке', 'Cable crunch', 'cable', 'isolation', ['abs'], { obliques: 0.3 }, 'crunch/cableCrunch'),
  ex('reverse_crunch', 'Обратные скручивания', 'Reverse crunch', 'bodyweight', 'isolation', ['abs'], {}, 'crunch/reverseCrunch'),
  ex('bicycle_crunch', 'Велосипед', 'Bicycle crunch', 'bodyweight', 'isolation', ['abs', 'obliques'], {}, 'crunch/bicycleCrunch'),
  ex('sit_up', 'Подъёмы корпуса', 'Sit-up', 'bodyweight', 'isolation', ['abs'], { obliques: 0.3 }, 'sitUp/sitUp'),
  ex('hanging_leg_raise', 'Подъём ног в висе', 'Hanging leg raise', 'bodyweight', 'isolation', ['abs'], { obliques: 0.3, forearms: 0.3 }, 'legRaise/hangingLegRaise'),
  ex('hanging_knee_raise', 'Подъём коленей в висе', 'Hanging knee raise', 'bodyweight', 'isolation', ['abs'], { obliques: 0.3, forearms: 0.3 }, 'legRaise/hangingKneeRaise'),
  ex('plank', 'Планка', 'Plank', 'bodyweight', 'isolation', ['abs'], { obliques: 0.5, front_delts: 0.3 }, 'plank/plank'),
  ex('side_plank', 'Боковая планка', 'Side plank', 'bodyweight', 'isolation', ['obliques'], { abs: 0.5 }, 'plank/sidePlank'),
  ex('russian_twist', 'Русские скручивания', 'Russian twist', 'bodyweight', 'isolation', ['obliques'], { abs: 0.5 }, 'core/russianTwist'),
  ex('ab_wheel_rollout', 'Ролик для пресса', 'Ab wheel rollout', 'other', 'isolation', ['abs'], { lats: 0.3, obliques: 0.3 }, null),
  ex('cable_woodchop', 'Дровосек на блоке', 'Cable woodchop', 'cable', 'isolation', ['obliques'], { abs: 0.5 }, 'chop/cableWoodchop'),
  ex('farmers_walk', 'Прогулка фермера', "Farmer's walk", 'dumbbell', 'compound', ['forearms', 'traps'], { abs: 0.3, glutes: 0.3, quads: 0.3 }, 'carry/farmersWalk'),
];
